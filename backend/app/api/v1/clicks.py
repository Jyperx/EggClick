
from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.v1.deps import get_current_user_id
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.redis import redis_client
from app.models.user import User
from app.schemas.click import ClickBatch
import json
import datetime
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

async def validate_clicks(user_id: str, count: int) -> bool:
    if count > 300:
        return False
    return True

def get_cooldown_penalty(clicks: int) -> int:
    if clicks >= 1400: return 300
    if clicks >= 1200: return 160
    if clicks >= 1000: return 80
    if clicks >= 800: return 40
    if clicks >= 600: return 20
    if clicks >= 400: return 10
    if clicks >= 200: return 5
    return 0

def get_inactivity_timeout(clicks: int) -> int:
    if clicks >= 1400: return 1800
    if clicks >= 1200: return 1200
    if clicks >= 1000: return 600
    if clicks >= 800: return 300
    if clicks >= 600: return 120
    if clicks >= 400: return 60
    if clicks >= 200: return 30
    return 15

def get_highest_threshold(clicks: int) -> int:
    return (clicks // 200) * 200

from app.services.auth import verify_jwt

@router.post("/")
async def register_clicks(
    request: Request,
    batch: ClickBatch, 
    db: AsyncSession = Depends(get_db),
    token_user_id: Optional[str] = Depends(verify_jwt)
):
    user_id = token_user_id
    
    if not user_id and batch.jwt_token:
        import jwt
        import os
        secret = os.getenv("JWT_SECRET", "super-secret-key-egg-game")
        try:
            decoded = jwt.decode(batch.jwt_token, secret, algorithms=["HS256"])
            user_id = decoded.get("sub")
        except Exception:
            pass
            
    if not user_id:
        return {"status": "error", "message": "Unauthorized"}
        
    return await process_click_batch(batch, user_id, db)

@router.post("/beacon")
async def beacon_clicks(request: Request, db: AsyncSession = Depends(get_db)):
    body_bytes = await request.body()
    try:
        body_text = body_bytes.decode("utf-8")
        data = json.loads(body_text)
        batch = ClickBatch(**data)
    except Exception:
        return {"status": "error", "message": "Invalid beacon data"}
        
    user_id = None
    if batch.jwt_token:
        import jwt
        import os
        secret = os.getenv("JWT_SECRET", "super-secret-key-egg-game")
        try:
            decoded = jwt.decode(batch.jwt_token, secret, algorithms=["HS256"])
            user_id = decoded.get("sub")
        except Exception:
            pass
            
    if not user_id:
        return {"status": "error", "message": "Unauthorized"}
        
    return await process_click_batch(batch, user_id, db)

async def process_click_batch(batch: ClickBatch, user_id: str, db: AsyncSession):
    # --- LIMITADOR DE FRECUENCIA DE API (Spam Bypass) ---
    # Permite máximo 1 petición cada 400ms (el frontend envía cada 500ms)
    rate_limit_key = f"rate_limit:{user_id}"
    allowed = await redis_client.set(rate_limit_key, "1", px=400, nx=True)
    if not allowed:
        return {"status": "success", "message": "rate_limited"}

    # 1. Validar Anti-Bot
    is_valid = await validate_clicks(user_id, batch.clicks)
    if not is_valid:
        return {"status": "success", "shadowbanned": True}
        
    if batch.clicks > 300: batch.clicks = 300
    if batch.frozen_clicks > 300: batch.frozen_clicks = 300
    
    now = datetime.datetime.utcnow()
    
    # 1.5 Verificar si el huevo global ya está roto (inactivo)
    global_status = await redis_client.get("global_egg_status")
    if global_status == "broken":
        # El juego está pausado, el huevo ya se rompió.
        # Rechazamos procesar clics hacia el huevo para evitar abusos.
        # Podríamos guardar el inventario, pero es más seguro retornar un estado especial.
        return {"status": "egg_broken", "message": "El huevo ya se ha roto. Espera a la nueva temporada."}

    # 2. Cargar estado desde Redis
    user_state_key = f"user_state:{user_id}"
    state = await redis_client.hgetall(user_state_key)
    
    if not state:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            state = {
                'id': user_id,
                'username': user_id.split('@')[0],
                'total_clicks': 0,
                'session_clicks': 0,
                'egg_coins': 0,
                'cooldown_until': '',
                'inventory': '{}',
                'device_fingerprint': batch.device_fingerprint or 'unknown',
                'clan_id': ''
            }
        else:
            state = {
                'id': str(user.id),
                'username': str(user.username),
                'total_clicks': str(user.total_clicks or 0),
                'session_clicks': str(user.session_clicks or 0),
                'egg_coins': str(user.egg_coins or 0),
                'cooldown_until': str(user.cooldown_until or ''),
                'inventory': json.dumps(user.inventory) if user.inventory else '{}',
                'device_fingerprint': str(user.device_fingerprint or 'unknown'),
                'clan_id': str(user.clan_id or '')
            }
        
        await redis_client.hset(user_state_key, mapping=state)
    
    session_clicks = int(state.get('session_clicks', 0))
    egg_coins = float(state.get('egg_coins', 0))
    total_clicks = int(state.get('total_clicks', 0))
    cooldown_until = state.get('cooldown_until', '')
    inventory = json.loads(state.get('inventory', '{}') or '{}')
    clan_id = state.get('clan_id', '')

    bypass_cooldown = False
    if hasattr(batch, 'bypass_cooldown_token') and batch.bypass_cooldown_token:
        try:
            import jwt, os
            secret = os.getenv("JWT_SECRET", "super-secret-key-egg-game")
            decoded = jwt.decode(batch.bypass_cooldown_token, secret, algorithms=["HS256"])
            if decoded.get("sub") == "adsense_reward": bypass_cooldown = True
        except Exception: pass
            
    if bypass_cooldown:
        cooldown_until = ''
        session_clicks = 0
        
    cooldown_end = None
    if cooldown_until:
        try:
            cooldown_end = datetime.datetime.fromisoformat(cooldown_until.replace("Z", ""))
            if now < cooldown_end:
                cd_ret = cooldown_until
                
                penalty_clicks = getattr(batch, 'overheat_penalty_clicks', 0)
                if penalty_clicks > 0:
                    cooldown_end += datetime.timedelta(seconds=penalty_clicks * 10)
                    cd_ret = cooldown_end.isoformat()
                    
                    pipe = redis_client.pipeline()
                    state_updates = {
                        'session_clicks': str(session_clicks),
                        'cooldown_until': cd_ret,
                        'inventory': json.dumps(inventory)
                    }
                    pipe.hset(user_state_key, mapping=state_updates)
                    pipe.hincrby(user_state_key, "total_clicks", 0)
                    pipe.sadd("pending_db_sync", user_id)
                    await pipe.execute()
                
                if cd_ret and not cd_ret.endswith("Z"): cd_ret += "Z"
                return {
                    "status": "cooldown", 
                    "cooldown_until": cd_ret,
                    "cooldown_time": int((cooldown_end - now).total_seconds()),
                    "session_clicks": session_clicks,
                    "egg_coins": egg_coins,
                    "inventory": inventory
                }
            else:
                cooldown_until = ''
        except Exception:
            cooldown_until = ''

    last_activity_iso = inventory.get("last_click_at")
    if last_activity_iso:
        try:
            last_activity = datetime.datetime.fromisoformat(last_activity_iso)
            inactivity_start = cooldown_end if (cooldown_end and cooldown_end > last_activity) else last_activity
            inactivity_req = get_inactivity_timeout(session_clicks)
            
            is_auto_active = (hasattr(batch, 'used_autoclicker_seconds') and batch.used_autoclicker_seconds > 0)
            
            if (now - inactivity_start).total_seconds() > inactivity_req and not is_auto_active:
                session_clicks = 0
        except Exception: pass

    # Calculamos el tiempo físico máximo permitido para evitar aceleración de tiempo (Vulnerabilidad 3)
    max_physical_seconds = 2.0
    if last_activity_iso:
        try:
            last_act = datetime.datetime.fromisoformat(last_activity_iso)
            max_physical_seconds = max(2.0, (now - last_act).total_seconds() + 1.0)
        except Exception:
            pass

    inventory["last_click_at"] = now.isoformat()
    
    auto_clicks_pool = 0
    if hasattr(batch, 'used_autoclicker_seconds') and batch.used_autoclicker_seconds > 0:
        current_sec = inventory.get("autoclicker_seconds", 0)
        claimed = min(float(batch.used_autoclicker_seconds), max_physical_seconds)
        actual_used = min(claimed, float(current_sec))
        if actual_used > 0:
            inventory["autoclicker_seconds"] = max(0, current_sec - actual_used)
            auto_clicks_pool += int(actual_used * 2)
            
    if hasattr(batch, 'used_touchme_seconds') and batch.used_touchme_seconds > 0:
        current_touch = inventory.get("touchme_seconds", 0)
        claimed_touch = min(float(batch.used_touchme_seconds), max_physical_seconds)
        actual_used_touch = min(claimed_touch, float(current_touch))
        if actual_used_touch > 0:
            inventory["touchme_seconds"] = max(0, current_touch - actual_used_touch)
            auto_clicks_pool += int(actual_used_touch * 20)
            
    used_ice_hands = getattr(batch, 'used_ice_hands', 0)
    
    valid_frozen_clicks = 0
    if used_ice_hands > 0:
        current_ice = inventory.get("ice_hand_uses", 0)
        actual_ice = min(used_ice_hands, current_ice)
        if actual_ice > 0:
            inventory["ice_hand_uses"] -= actual_ice
            session_clicks = 0
            valid_frozen_clicks = batch.frozen_clicks
            
    if valid_frozen_clicks == 0 and batch.frozen_clicks > 0:
        batch.clicks += batch.frozen_clicks
        batch.frozen_clicks = 0
            
    martillo_uses = inventory.get("martillo_uses", 0)
    hamass_uses = inventory.get("hamass_uses", 0)
    
    final_manual_clicks = 0
    final_auto_clicks = 0
    
    for _ in range(batch.clicks):
        power = 1
        if hamass_uses > 0:
            power = 100
            hamass_uses -= 1
        elif martillo_uses > 0:
            power = 5
            martillo_uses -= 1
        final_manual_clicks += power
        
    for _ in range(batch.frozen_clicks):
        power = 1
        if hamass_uses > 0:
            power = 100
            hamass_uses -= 1
        elif martillo_uses > 0:
            power = 5
            martillo_uses -= 1
        final_manual_clicks += power
        
    for _ in range(auto_clicks_pool):
        power = 1
        if hamass_uses > 0:
            power = 100
            hamass_uses -= 1
        elif martillo_uses > 0:
            power = 5
            martillo_uses -= 1
        final_auto_clicks += power
        
    inventory["martillo_uses"] = martillo_uses
    inventory["hamass_uses"] = hamass_uses
    
    total_added = final_manual_clicks + final_auto_clicks
    if total_added == 0:
        if bypass_cooldown:
            pipe = redis_client.pipeline()
            state_updates = {
                'session_clicks': '0',
                'cooldown_until': '',
                'inventory': json.dumps(inventory)
            }
            pipe.hset(user_state_key, mapping=state_updates)
            pipe.sadd("pending_db_sync", user_id)
            await pipe.execute()
        return {"status": "success", "added": 0, "egg_coins": egg_coins, "inventory": inventory, "session_clicks": session_clicks, "cooldown_until": "", "cooldown_time": 0}
        
    old_session = session_clicks
    session_clicks += batch.clicks + auto_clicks_pool
    
    cooldown_time = 0
    old_thresh = get_highest_threshold(old_session)
    new_thresh = get_highest_threshold(session_clicks)
    
    if new_thresh > old_thresh:
        penalty = get_cooldown_penalty(session_clicks)
        if penalty > 0:
            cooldown_end_calc = now + datetime.timedelta(seconds=penalty)
            cooldown_until = cooldown_end_calc.isoformat()
            cooldown_time = penalty
            
    old_clicks = total_clicks
    new_coins_earned = ((old_clicks + total_added) // 10) - (old_clicks // 10)
    new_clan_coins = ((old_clicks + total_added) // 100) - (old_clicks // 100)
    total_clicks += total_added
    
    pipe = redis_client.pipeline()
    
    clan_tax = 0.0
    if clan_id:
        clan_tax = float(new_clan_coins)
        user_keep = float(new_coins_earned)
        
        if clan_tax > 0:
            pipe.hincrbyfloat(f"clan_state:{clan_id}", "egg_coins", clan_tax)
            pipe.hincrbyfloat(user_state_key, "clan_contribution", clan_tax)
        
        pipe.hincrby(f"clan_state:{clan_id}", "total_clicks", total_added)
        pipe.sadd("pending_clan_sync", clan_id)
        
        if user_keep > 0:
            pipe.hincrbyfloat(user_state_key, "egg_coins", user_keep)
        egg_coins += user_keep
    else:
        if new_coins_earned > 0:
            pipe.hincrbyfloat(user_state_key, "egg_coins", float(new_coins_earned))
        egg_coins += new_coins_earned
        
    state_updates = {
        'session_clicks': str(session_clicks),
        'cooldown_until': cooldown_until,
        'inventory': json.dumps(inventory)
    }
    pipe.hset(user_state_key, mapping=state_updates)
    pipe.hincrby(user_state_key, "total_clicks", total_added)
    
    pipe.sadd("pending_db_sync", user_id)
    
    # --- LÓGICA ATÓMICA DE RUPTURA DEL HUEVO ---
    # Incrementamos el contador global absoluto
    new_global_clicks = await redis_client.incrby("global_egg_current_clicks", total_added)
    required_str = await redis_client.get("global_egg_total_clicks")
    required_clicks = int(required_str) if required_str else 1000000000
    
    if new_global_clicks >= required_clicks:
        # ¡El huevo ha sido roto! Intentamos adquirir el lock atómico para ser el ganador único
        won = await redis_client.setnx("egg_break_lock", "1")
        if won:
            await redis_client.set("global_egg_status", "broken")
            winner_name = state.get("username", user_id.split('@')[0])
            await redis_client.set("global_egg_winner", winner_name)
            prize_usd = await redis_client.get("global_egg_prize_usd")
            
            # Notificar a todos por WebSocket
            msg = json.dumps({"type": "egg_broken", "winner": winner_name, "prize_usd": prize_usd})
            await redis_client.publish("global_events", msg)
            
            # Cerrar la temporada en la base de datos de inmediato
            try:
                from app.models.game import GlobalGameState
                result = await db.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
                global_state = result.scalars().first()
                if global_state:
                    global_state.is_active = False
                    global_state.current_clicks = global_state.total_clicks_required
                    await db.commit()
            except Exception as e:
                print(f"Error closing season in DB: {e}")

    results = await pipe.execute()
    
    if clan_id and clan_tax > 0:
        current_clan_coins = await redis_client.hget(f"clan_state:{clan_id}", "egg_coins")
        if current_clan_coins:
            curr_float = float(current_clan_coins)
            prev_float = curr_float - clan_tax
            diff_int = int(curr_float) - int(prev_float)
            if diff_int > 0:
                from app.models.social import Clan
                clan_db = await db.execute(select(Clan).where(Clan.id == int(clan_id)))
                clan_obj = clan_db.scalars().first()
                total_clan_coins = float(clan_obj.egg_coins) + curr_float if clan_obj else curr_float
                
                msg = json.dumps({"type": "clan_update", "clan_id": clan_id, "egg_coins": total_clan_coins, "tax": diff_int})
                await redis_client.publish("global_events", msg)
    
    cd_ret_final = cooldown_until
    if cd_ret_final and not cd_ret_final.endswith("Z"): cd_ret_final += "Z"
        
    result_payload = {
        "status": "success", 
        "added": total_added, 
        "egg_coins": egg_coins,
        "inventory": inventory,
        "session_clicks": session_clicks,
        "cooldown_until": cd_ret_final,
        "cooldown_time": cooldown_time,
        "time_since_last_click": 0,
        "clan_tax": clan_tax,
        "total_clicks": total_clicks
    }
    
    # Publicar resultado al usuario específico para el WebSocket
    await redis_client.publish(f"user_state:{user_id}", json.dumps(result_payload))
    
    # Publicar evento global de +1 al líderboard si se sumaron clics reales
    if total_added > 0:
        username = state.get("username", user_id.split('@')[0])
        event = {
            "type": "user_click",
            "username": username,
            "clicks": total_added,
            "details": {
                "manual": batch.clicks,
                "frozen": batch.frozen_clicks,
                "auto_seconds": getattr(batch, 'used_autoclicker_seconds', 0),
                "touchme_seconds": getattr(batch, 'used_touchme_seconds', 0),
                "ice_hands": getattr(batch, 'used_ice_hands', 0)
            }
        }
        await redis_client.publish("global_events", json.dumps(event))

    return result_payload

@router.post("/skip_cooldown_ad")
async def skip_cooldown_ad(
    token_user_id: str = Depends(verify_jwt)
):
    if not token_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    user_state_key = f"user_state:{token_user_id}"
    
    # Simplemente reseteamos los session_clicks a 0 y borramos el cooldown
    pipe = redis_client.pipeline()
    state_updates = {
        'session_clicks': '0',
        'cooldown_until': ''
    }
    pipe.hset(user_state_key, mapping=state_updates)
    pipe.sadd("pending_db_sync", token_user_id)
    await pipe.execute()
    
    return {"status": "success", "message": "Cooldown reset from ad reward", "session_clicks": 0, "cooldown_until": ""}
    # Simplemente reseteamos los session_clicks a 0 y borramos el cooldown
    pipe = redis_client.pipeline()
    state_updates = {
        'session_clicks': '0',
        'cooldown_until': ''
    }
    pipe.hset(user_state_key, mapping=state_updates)
    pipe.sadd("pending_db_sync", token_user_id)
    await pipe.execute()
    
    return {"status": "success", "message": "Cooldown reset from ad reward", "session_clicks": 0, "cooldown_until": ""}
