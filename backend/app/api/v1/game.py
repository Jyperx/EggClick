from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.v1.deps import get_current_user_id
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.database import get_db
from app.db.redis import redis_client
from app.models.game import GlobalGameState
from app.models.user import User
import json
import datetime
from pydantic import BaseModel

router = APIRouter()

@router.get("/state")
async def get_game_state(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
    state = result.scalars().first()
    
    if not state:
        # Inicializar el primer juego si no existe
        state = GlobalGameState(prize_pool_usd=150.00)
        db.add(state)
        await db.commit()
        await db.refresh(state)
        
    # Obtener estado absoluto desde Redis (fuente de verdad actual)
    redis_clicks = await redis_client.get("global_egg_current_clicks")
    redis_status = await redis_client.get("global_egg_status")
    redis_total = await redis_client.get("global_egg_total_clicks")
    redis_prize = await redis_client.get("global_egg_prize_usd")
    
    current_clicks = int(redis_clicks) if redis_clicks else state.current_clicks
    total_clicks = int(redis_total) if redis_total else state.total_clicks_required
    is_active = (redis_status == "active") if redis_status else state.is_active
    prize_usd = float(redis_prize) if redis_prize else float(state.prize_pool_usd)
    
    # Obtener el ganador si está roto
    winner = None
    if not is_active:
        redis_winner = await redis_client.get("global_egg_winner")
        winner = redis_winner.decode('utf-8') if hasattr(redis_winner, 'decode') else redis_winner
        if not winner:
            winner = "Desconocido"
    
    return {
        "current_clicks": current_clicks,
        "required_clicks": total_clicks,
        "prize_usd": prize_usd,
        "is_active": is_active,
        "winner": winner
    }

class ContactInfoRequest(BaseModel):
    contact_method: str
    contact_details: str

@router.post("/contact-info")
async def save_contact_info(req: ContactInfoRequest, token_user_id: str = Depends(get_current_user_id)):
    if not token_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    info = {
        "user_id": token_user_id,
        "method": req.contact_method,
        "details": req.contact_details,
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    
    await redis_client.hset("winners_contact_info", token_user_id, json.dumps(info))
    return {"status": "success", "message": "Contact info saved"}

@router.get("/user/{user_id}")
async def get_user_state(user_id: str, db: AsyncSession = Depends(get_db)):
    # 1. Intentar leer estado fresco desde Redis (Write-Behind cache)
    state = await redis_client.hgetall(f"user_state:{user_id}")
    
    # Necesitamos consultar PostgreSQL para datos estáticos (username, country, clan_id)
    # o si no hay estado en Redis.
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"egg_coins": 0, "inventory": {}, "country": None, "clan_id": None}
        
    clan_name = None
    clan_shield_id = None
    personal_coins = user.egg_coins
    clan_egg_coins = None
    
    if user.clan_id:
        from app.models.social import Clan
        clan_result = await db.execute(select(Clan).where(Clan.id == user.clan_id))
        clan = clan_result.scalars().first()
        if clan:
            clan_name = clan.name
            clan_shield_id = clan.shield_id
            # Para el clan también deberíamos leer de Redis, pero por ahora simplificamos
            # Si el clan está activo, el worker actualiza clan_state en Redis.
            clan_state = await redis_client.hgetall(f"clan_state:{clan.id}")
            if clan_state and 'egg_coins' in clan_state:
                clan_egg_coins = clan.egg_coins + int(float(clan_state.get('egg_coins', 0)))
            else:
                clan_egg_coins = clan.egg_coins

    import datetime
    now_utc = datetime.datetime.utcnow()

    if state:
        import json
        session_clicks = int(state.get('session_clicks', 0))
        personal_coins = int(float(state.get('egg_coins', user.egg_coins)))
        total_clicks = int(state.get('total_clicks', user.total_clicks))
            
        inv = json.loads(state.get('inventory', '{}') or '{}')
        cd_until = state.get('cooldown_until')
    else:
        session_clicks = getattr(user, 'session_clicks', 0)
        total_clicks = user.total_clicks
        inv = dict(user.inventory) if user.inventory else {}
        cd_until = getattr(user, 'cooldown_until', None)

    if cd_until and not cd_until.endswith("Z"):
        cd_until += "Z"
        
    cooldown_time = 0
    if cd_until:
        try:
            cd_end = datetime.datetime.fromisoformat(cd_until.replace("Z", ""))
            if cd_end > now_utc:
                cooldown_time = int((cd_end - now_utc).total_seconds())
        except Exception:
            pass

    time_since_last_click = 0
    inactivity_start_time = None
    last_click_iso = inv.get("last_click_at")
    
    if last_click_iso:
        try:
            last_click = datetime.datetime.fromisoformat(last_click_iso.replace("Z", ""))
            inactivity_start_time = last_click
        except Exception:
            pass

    # Ajustar inicio de inactividad si hay cooldown
    if cd_until:
        try:
            cd_end = datetime.datetime.fromisoformat(cd_until.replace("Z", ""))
            if inactivity_start_time and cd_end > inactivity_start_time:
                inactivity_start_time = cd_end
            elif not inactivity_start_time:
                inactivity_start_time = cd_end
        except Exception:
            pass
            
    if inactivity_start_time:
        diff = (now_utc - inactivity_start_time).total_seconds()
        if diff > 0:
            time_since_last_click = int(diff)

    # Aplicar lógica de inactividad al leer el estado
    def get_inactivity_timeout(clicks: int) -> int:
        if clicks >= 1400: return 1800
        if clicks >= 1200: return 1200
        if clicks >= 1000: return 600
        if clicks >= 800: return 300
        if clicks >= 600: return 120
        if clicks >= 400: return 60
        if clicks >= 200: return 30
        return 15

    if time_since_last_click > get_inactivity_timeout(session_clicks):
        session_clicks = 0

    ban_data = await redis_client.get(f"ban:{user_id}")
    is_banned = False
    ban_reason = None
    ban_expires_at = None
    
    if ban_data:
        is_banned = True
        try:
            ban_info = json.loads(ban_data)
            ban_reason = ban_info.get("reason")
            ban_expires_at = ban_info.get("expires_at")
        except:
            pass
    elif await redis_client.sismember("banned_users", user_id):
        is_banned = True

    return {
        "username": user.username,
        "egg_coins": personal_coins, 
        "clan_egg_coins": clan_egg_coins,
        "inventory": inv, 
        "country": getattr(user, 'country', None),
        "clan_id": getattr(user, 'clan_id', None),
        "clan_name": clan_name,
        "clan_shield_id": clan_shield_id,
        "session_clicks": session_clicks,
        "cooldown_time": cooldown_time,
        "time_since_last_click": time_since_last_click,
        "total_clicks": total_clicks,
        "is_banned": is_banned,
        "ban_reason": ban_reason,
        "ban_expires_at": ban_expires_at
    }

import random

ADJECTIVES = ["Dark", "Shadow", "Crimson", "Golden", "Neon", "Cyber", "Mystic", "Iron", "Storm", "Void", "Crystal", "Silver", "Lunar", "Solar", "Cosmic", "Phantom", "Toxic", "Venom", "Ghost", "Alpha", "Omega", "Frost", "Flame", "Chaos", "Wild", "Brave", "Swift", "Silent", "Savage"]
NOUNS = ["Knight", "Dragon", "Ninja", "Samurai", "Wolf", "Tiger", "Eagle", "Falcon", "Viper", "Cobra", "Reaper", "Hunter", "Slayer", "Warlord", "Demon", "Angel", "Titan", "Ghost", "Wizard", "Mage", "Rogue", "Sniper", "Raven", "Phoenix", "King", "Lord", "Beast", "Wraith"]

def generate_suggestions(base_name: str, existing_names: set) -> list:
    suggestions = set()
    # Try appending numbers
    for _ in range(3):
        num = random.randint(10, 999)
        name = f"{base_name[:12]}{num}"
        if name not in existing_names:
            suggestions.add(name)
            
    # Try combinations
    while len(suggestions) < 5:
        adj = random.choice(ADJECTIVES)
        noun = random.choice(NOUNS)
        name = f"{adj}{noun}"
        if name not in existing_names:
            suggestions.add(name)
            
    return list(suggestions)

from pydantic import BaseModel
from typing import Optional

class ProfileUpdate(BaseModel):
    country: str
    username: Optional[str] = None

@router.put("/user/{user_id}/profile")
async def update_user_profile(user_id: str, data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        # Auto-create user on first profile setup (new account)
        default_username = data.username or user_id.split('@')[0]
        user = User(
            id=user_id,
            username=default_username,
            total_clicks=0,
            egg_coins=0,
            country=data.country,
            inventory={}
        )
        db.add(user)
    else:
        user.country = data.country

    if data.username:
        # Check if username exists (excluding self), case-insensitive
        existing = await db.execute(
            select(User)
            .where(func.lower(User.username) == func.lower(data.username))
            .where(User.id != user_id)
        )
        if existing.scalars().first():
            # Get all taken usernames to avoid suggesting them
            all_users = await db.execute(select(User.username))
            taken = set(u for u in all_users.scalars().all() if u)
            suggestions = generate_suggestions(data.username, taken)
            return {"status": "error", "message": "Username already taken", "suggestions": suggestions}
        user.username = data.username
        
    await db.commit()
    
    # Update Redis cache so the new username is used in events/clicks immediately
    if data.username:
        await redis_client.hset(f"user_state:{user_id}", "username", data.username)
        
    return {"status": "success", "country": user.country, "username": user.username}

def _sync_spin_state(inv, current_date_str):
    if inv.get("spin_tracker_date") != current_date_str:
        inv["spin_tracker_date"] = current_date_str
        inv["available_spins"] = 1
        inv["purchased_spins_count"] = 0
        inv["super_spin_used"] = False
    return inv

@router.post("/user/{user_id}/daily-spin")
async def daily_spin(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    if not current_user_id or current_user_id == "anon_user" or current_user_id != user_id:
        raise HTTPException(status_code=401, detail="Must be logged in to spin")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Read from Redis
    state = await redis_client.hgetall(f"user_state:{user_id}")
    
    import json
    import datetime
    
    now_utc = datetime.datetime.utcnow()
    current_date_str = now_utc.strftime("%Y-%m-%d")
    # --- Lua Script: Atomic check for available spins ---
    lua_check_spin = """
    local state_key = KEYS[1]
    local current_date = ARGV[1]
    
    local inv_str = redis.call('HGET', state_key, 'inventory')
    if not inv_str then return -1 end
    
    local lock_key = 'spin_lock:' .. state_key
    local locked = redis.call('SET', lock_key, '1', 'NX', 'EX', 5)
    if not locked then return -2 end
    return 1
    """
    
    lock_result = await redis_client.eval(lua_check_spin, 1, f"user_state:{user_id}", current_date_str)
    if lock_result == -2:
        raise HTTPException(status_code=429, detail="Procesando giro, por favor espera.")
        
    try:
        if state and 'inventory' in state:
            inv = json.loads(state.get('inventory', '{}') or '{}')
        else:
            inv = dict(user.inventory) if user.inventory else {}

        inv = _sync_spin_state(inv, current_date_str)

        if inv.get("available_spins", 0) <= 0:
            raise HTTPException(status_code=400, detail="No tienes giros disponibles. Vuelve mañana o compra más.")

        is_super_spin = not inv.get("super_spin_used", False)
        
        # Tirada
        roll = random.random() # 0.0 to 1.0
        if is_super_spin:
            if roll < 0.40: prize = random.randint(10, 50)
            elif roll < 0.78: prize = random.randint(50, 200)
            elif roll < 0.965: prize = random.randint(200, 499)
            elif roll < 0.993: prize = random.randint(500, 999)
            else: prize = 1000
        else:
            if roll < 0.60: prize = random.randint(10, 50)
            elif roll < 0.90: prize = random.randint(50, 200)
            elif roll < 0.985: prize = random.randint(200, 499)
            elif roll < 0.998: prize = random.randint(500, 999)
            else: prize = 1000

        # Apply reward atomically
        final_coins_float = await redis_client.hincrbyfloat(f"user_state:{user_id}", "egg_coins", prize)
        final_coins = int(final_coins_float)
    
        # Update inventory
        inv["available_spins"] -= 1
        if is_super_spin:
            inv["super_spin_used"] = True
        
        redis_updates = {
            "inventory": json.dumps(inv),
            "egg_coins": str(final_coins) # sync float conversion explicitly
        }
        await redis_client.hset(f"user_state:{user_id}", mapping=redis_updates)
    
        from sqlalchemy.orm.attributes import flag_modified
        user.inventory = inv
        flag_modified(user, "inventory")
        await db.commit()

        return {"status": "success", "prize": prize, "egg_coins": final_coins, "inventory": inv, "is_super_spin": is_super_spin}
    finally:
        await redis_client.delete(f"spin_lock:user_state:{user_id}")

from pydantic import BaseModel
class BuySpinsRequest(BaseModel):
    count: int

@router.post("/user/{user_id}/buy-spins")
async def buy_spins(
    user_id: str,
    req: BuySpinsRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    if not current_user_id or current_user_id == "anon_user" or current_user_id != user_id:
        raise HTTPException(status_code=401, detail="Must be logged in to buy spins")
        
    if req.count <= 0 or req.count > 10:
        raise HTTPException(status_code=400, detail="Cantidad inválida.")
        
    cost = req.count * 100

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    state = await redis_client.hgetall(f"user_state:{user_id}")
    import json
    import datetime
    
    current_coins = float(state.get('egg_coins', 0)) if state and 'egg_coins' in state else 0
    
    if current_coins < cost:
        raise HTTPException(status_code=400, detail="No tienes suficientes EggCoins.")
        
    # --- Distributed Lock for Buy Spins ---
    lock_key = f"buy_spin_lock:user_state:{user_id}"
    locked = await redis_client.set(lock_key, "1", ex=5, nx=True)
    if not locked:
        raise HTTPException(status_code=429, detail="Procesando compra, por favor espera.")
        
    try:
        if state and 'inventory' in state:
            inv = json.loads(state.get('inventory', '{}') or '{}')
        else:
            inv = dict(user.inventory) if user.inventory else {}

        now_utc = datetime.datetime.utcnow()
        current_date_str = now_utc.strftime("%Y-%m-%d")

        inv = _sync_spin_state(inv, current_date_str)
        
        if inv.get("purchased_spins_count", 0) + req.count > 10:
            raise HTTPException(status_code=400, detail="Has superado el límite diario de 10 giros comprados.")

        # Deduct coins
        final_coins_float = await redis_client.hincrbyfloat(f"user_state:{user_id}", "egg_coins", -cost)
        if final_coins_float < 0:
            # Revert
            await redis_client.hincrbyfloat(f"user_state:{user_id}", "egg_coins", cost)
            raise HTTPException(status_code=400, detail="No tienes suficientes EggCoins.")
            
        final_coins = int(final_coins_float)
    
        # Update inventory
        inv["available_spins"] = inv.get("available_spins", 0) + req.count
        inv["purchased_spins_count"] = inv.get("purchased_spins_count", 0) + req.count
        
        redis_updates = {
            "inventory": json.dumps(inv),
            "egg_coins": str(final_coins)
        }
        await redis_client.hset(f"user_state:{user_id}", mapping=redis_updates)
    
        from sqlalchemy.orm.attributes import flag_modified
        user.inventory = inv
        flag_modified(user, "inventory")
        await db.commit()

        return {"status": "success", "egg_coins": final_coins, "inventory": inv}
    finally:
        await redis_client.delete(lock_key)

@router.post("/appeal")
async def submit_appeal(request: Request, body: dict):
    import jwt, os, datetime, json
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "No token")
    token = auth.split(" ")[1]
    secret = os.getenv("JWT_SECRET", "super-secret-key-egg-game")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(401, "Invalid token")
        
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(400, "El mensaje no puede estar vacío")
        
    appeal = {
        "user_id": user_id,
        "message": message,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }
    await redis_client.rpush("ban_appeals", json.dumps(appeal))
    return {"status": "success", "message": "Apelación enviada correctamente"}
