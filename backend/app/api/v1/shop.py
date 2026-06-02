from fastapi import APIRouter, Depends, HTTPException, Body
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.models.shop import ShopItem
from app.models.user import User
from app.api.v1.deps import get_current_user_id

router = APIRouter()

@router.get("/items")
async def get_shop_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShopItem))
    items = result.scalars().all()
    
    if len(items) < 5:
        # Definir los 5 ítems oficiales
        all_items = [
            ShopItem(id=1, name="Autoclicker", description="Da 1 clic automático por segundo durante 1 minuto (mientras estés activo).", cost_egg_coins=50, cost_usd=None),
            ShopItem(id=2, name="Martillo x5", description="Tus próximos 20 clics valen x5. ¡Deja grietas!", cost_egg_coins=150, cost_usd=None),
            ShopItem(id=3, name="Mano Helada", description="Evita que el huevo se queme 1 vez. Lo congela instantáneamente.", cost_egg_coins=80, cost_usd=None),
            ShopItem(id=4, name="TouchMe", description="Mantén presionado para generar 20 clics por segundo. Dura 10 segundos de uso.", cost_egg_coins=150, cost_usd=None),
            ShopItem(id=5, name="HamAss", description="El martillo definitivo. 5 golpes devastadores de +100 clics cada uno.", cost_egg_coins=500, cost_usd=None)
        ]
        
        # Insertar solo los que faltan
        existing_ids = [i.id for i in items]
        items_to_add = [i for i in all_items if i.id not in existing_ids]
        
        if items_to_add:
            db.add_all(items_to_add)
            await db.commit()
            
        # Volver a cargar para devolver la lista completa
        result = await db.execute(select(ShopItem))
        items = result.scalars().all()
        
    return items

@router.post("/buy/{item_id}")
async def buy_item(
    item_id: int, 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    if not user_id or user_id == "anon_user":
        raise HTTPException(status_code=401, detail="Must be logged in to buy")
        
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    item_result = await db.execute(select(ShopItem).where(ShopItem.id == item_id))
    item = item_result.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if item.cost_egg_coins is None:
        raise HTTPException(status_code=400, detail="Item is not available for EggCoins")
        
    # Script Lua para atomic check-and-deduct en Redis
    # Evita el robo por concurrencia (Race Condition)
    lua_script = """
    local balance = redis.call('HGET', KEYS[1], 'egg_coins')
    if balance then
        balance = tonumber(balance)
    else
        balance = tonumber(ARGV[2])
    end
    
    local cost = tonumber(ARGV[1])
    
    if balance >= cost then
        redis.call('HINCRBYFLOAT', KEYS[1], 'egg_coins', -cost)
        return balance - cost
    else
        return -1
    end
    """
    
    from app.db.redis import redis_client
    user_state_key = f"user_state:{user.id}"
    
    # Ejecutamos el script atómico
    result = await redis_client.eval(lua_script, 1, user_state_key, item.cost_egg_coins, user.egg_coins)
    
    if result == -1:
        raise HTTPException(status_code=400, detail="Not enough EggCoins")
        
    final_coins = float(result)
    
    state = await redis_client.hgetall(user_state_key)
    
    if state and 'inventory' in state:
        inv = json.loads(state.get('inventory', '{}') or '{}')
    else:
        inv = dict(user.inventory) if user.inventory else {}
    
    # Dependiendo del item_id, otorgamos el beneficio
    if item_id == 1: # Autoclicker (acumula tiempo: +60 seg)
        inv["autoclicker_seconds"] = inv.get("autoclicker_seconds", 0) + 60
    elif item_id == 2: # Martillo x5 (+20 usos)
        inv["martillo_uses"] = inv.get("martillo_uses", 0) + 20
    elif item_id == 3: # Mano Helada (+1 uso)
        inv["ice_hand_uses"] = inv.get("ice_hand_uses", 0) + 1
    elif item_id == 4: # TouchMe (+10 segundos)
        inv["touchme_seconds"] = inv.get("touchme_seconds", 0) + 10
    elif item_id == 5: # HamAss (+5 usos)
        inv["hamass_uses"] = inv.get("hamass_uses", 0) + 5
        
    import datetime
    inv["last_click_at"] = datetime.datetime.utcnow().isoformat()
        
    user.inventory = inv
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user, "inventory")
    
    # Guardar la compra en base de datos primero (para inventario y clanes)
    await db.commit()
    
    # Sincronizar inmediatamente en Redis para que el worker no lo sobrescriba
    
    redis_updates = {
        "inventory": json.dumps(inv)
    }
    await redis_client.hset(user_state_key, mapping=redis_updates)
    
    # Notificar a la consola de administración en vivo
    monitor_msg = json.dumps({
        "event": "purchase",
        "user": user.id,
        "item_id": item_id,
        "item_name": item.name,
        "cost": item.cost_egg_coins
    })
    await redis_client.publish("admin_monitor", monitor_msg)
        
    return {"status": "success", "egg_coins": int(final_coins), "inventory": user.inventory}
