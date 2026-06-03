from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import clicks, game, shop, social, clans, ads
from app.db.database import engine, AsyncSessionLocal
from app.models.base import Base
from app.models.game import GlobalGameState
from app.models.user import User
from app.models.shop import ShopItem
from app.models.social import Clan
from app.db.redis import redis_client
from app.websocket_manager import manager
from sqlalchemy.future import select
from sqlalchemy import update, text
from decimal import Decimal
import asyncio
import json
import os
import uvicorn
from arq import create_pool
from arq.connections import RedisSettings


app = FastAPI(title="Egg Clicker API")

# CORS para permitir peticiones desde Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://eggclick.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app", # <--- EL COMODÍN MÁGICO: Acepta cualquier subdominio de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.models.user import User
from app.models.social import Clan
from sqlalchemy import update

async def warmup_redis_cache():
    try:
        # Precargar estado global del juego si no existe
        egg_status = await redis_client.get("global_egg_status")
        if not egg_status:
            print("[Warmup] Precargando estado global del huevo...")
            from app.models.game import GlobalGameState
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
                global_state = result.scalars().first()
                if global_state:
                    await redis_client.set("global_egg_current_clicks", str(global_state.current_clicks))
                    await redis_client.set("global_egg_total_clicks", str(global_state.total_clicks_required))
                    await redis_client.set("global_egg_status", "active")
        
        keys = await redis_client.keys("user_state:*")
        if len(keys) > 0:
            print("[Warmup] Redis ya tiene estados cacheados, omitiendo warmup.")
            return
            
        print("[Warmup] Redis está vacío. Precargando Top 100 usuarios activos...")
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).order_by(User.total_clicks.desc()).limit(100)
            )
            users = result.scalars().all()
            
            if users:
                pipe = redis_client.pipeline()
                for user in users:
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
                    pipe.hset(f"user_state:{user.id}", mapping=state)
                await pipe.execute()
                print(f"[Warmup] {len(users)} usuarios precargados exitosamente en Redis.")
    except Exception as e:
        print(f"[Warmup Error] {e}")

async def sync_users_to_db():
    while True:
        await asyncio.sleep(30) # Sincronizar usuarios cada 30 segundos
        try:
            # Sincronizar Usuarios
            # Usar SPOP para extraer y remover al mismo tiempo para no procesar 2 veces
            pending_users = await redis_client.spop("pending_db_sync", count=500)
            if pending_users:
                async with AsyncSessionLocal() as session:
                    for user_id in pending_users:
                        state = await redis_client.hgetall(f"user_state:{user_id}")
                        if not state: continue
                        
                        try:
                            # Hacemos UPDATE directo sin cargar el objeto para mayor velocidad
                            await session.execute(
                                update(User).
                                where(User.id == user_id).
                                values(
                                    total_clicks=int(state.get('total_clicks', 0)),
                                    session_clicks=int(state.get('session_clicks', 0)),
                                    egg_coins=float(state.get('egg_coins', 0)),
                                    cooldown_until=state.get('cooldown_until', '') or None,
                                    inventory=json.loads(state.get('inventory', '{}')),
                                    device_fingerprint=state.get('device_fingerprint', 'unknown')
                                )
                            )
                        except Exception as e:
                            print(f"Error syncing user {user_id}: {e}")
                            
                    await session.commit()
                    
            # Sincronizar Clanes
            pending_clans = await redis_client.spop("pending_clan_sync", count=100)
            if pending_clans:
                async with AsyncSessionLocal() as session:
                    for clan_id in pending_clans:
                        clan_key = f"clan_state:{clan_id}"
                        # Obtener incrementos pendientes
                        coins_inc = await redis_client.hget(clan_key, "egg_coins")
                        clicks_inc = await redis_client.hget(clan_key, "total_clicks")
                        
                        if coins_inc or clicks_inc:
                            c_coins = float(coins_inc or 0)
                            c_clicks = int(clicks_inc or 0)
                            
                            # Resetear contadores de incremento en Redis usando hincrby negativos
                            if c_coins: await redis_client.hincrbyfloat(clan_key, "egg_coins", -c_coins)
                            if c_clicks: await redis_client.hincrby(clan_key, "total_clicks", -c_clicks)
                            
                            # Actualizar PostgreSQL de forma atómica (x = x + y)
                            from sqlalchemy import text
                            await session.execute(
                                update(Clan).
                                where(Clan.id == int(clan_id)).
                                values(
                                    total_clicks=Clan.total_clicks + c_clicks,
                                    egg_coins=Clan.egg_coins + c_coins
                                )
                            )
                    await session.commit()

        except Exception as e:
            print(f"Error in sync_users_to_db: {e}")

async def sync_clicks_to_db():
    while True:
        await asyncio.sleep(5) # Sincronizar cada 5 segundos
        try:
            # Sincronizar estado global absoluto desde Redis
            redis_current_clicks = await redis_client.get("global_egg_current_clicks")
            if redis_current_clicks is not None:
                clicks = int(redis_current_clicks)
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
                    state = result.scalars().first()
                    if state and state.current_clicks != clicks:
                        state.current_clicks = clicks
                        await session.commit()
                        
            prize_buffer = await redis_client.getset("prize_pool_clicks_buffer", 0)
            if prize_buffer and int(prize_buffer) > 0:
                p_clicks = int(prize_buffer)
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
                    state = result.scalars().first()
                    
                    if state:
                        current_unprocessed = state.unprocessed_clicks_for_prize or 0
                        total_unprocessed = current_unprocessed + p_clicks
                        
                        blocks = total_unprocessed // 1000
                        remainder = total_unprocessed % 1000
                        
                        state.unprocessed_clicks_for_prize = remainder
                        
                        if blocks > 0:
                            new_prize = float(state.prize_pool_usd) + (blocks * 0.001)
                            state.prize_pool_usd = Decimal(str(new_prize))
                            await redis_client.set("global_egg_prize_usd", str(new_prize))
                            
                        await session.commit()
                        print(f"[Sync] Añadidos {blocks} bloques de $0.001. Premio actual: {state.prize_pool_usd}")
        except Exception as e:
            print(f"[Sync Error] {e}")

async def ws_broadcast_task():
    while True:
        try:
            if manager.active_connections:
                redis_clicks = await redis_client.get("global_egg_current_clicks")
                redis_prize = await redis_client.get("global_egg_prize_usd")
                
                if redis_clicks is not None:
                    clicks = int(redis_clicks)
                    prize = float(redis_prize) if redis_prize else 150.00
                    
                    if redis_prize is None:
                        # Fallback DB
                        async with AsyncSessionLocal() as session:
                            result = await session.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
                            state = result.scalars().first()
                            if state:
                                prize = float(state.prize_pool_usd)
                                await redis_client.set("global_egg_prize_usd", str(prize))
                    
                    await manager.broadcast_state(clicks, prize)
        except Exception as e:
            print(f"[WS Broadcast Error] {e}")
        await asyncio.sleep(0.5)

async def ws_events_task():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("global_events")
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message' and message.get('data'):
                data = message['data']
                if isinstance(data, bytes):
                    data = data.decode('utf-8')
                await manager.broadcast(data)
    except Exception as e:
        print(f"[WS Events Error] {e}")
        await asyncio.sleep(5)
        asyncio.create_task(ws_events_task())

@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def listen_pubsub(websocket: WebSocket, pubsub):
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                if isinstance(data, bytes):
                    data = data.decode('utf-8')
                await websocket.send_text(data)
    except Exception:
        pass

@app.websocket("/ws/user/{user_id}")
async def user_websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
        
    import jwt, os
    secret = os.environ["JWT_SECRET"]
    try:
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        if decoded.get("sub") != user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    # Evitar multi-pestaña usando el ConnectionManager global
    existing_ws = manager.user_connections.get(user_id)
    if existing_ws:
        try:
            await existing_ws.send_json({"type": "force_disconnect", "reason": "multiple_tabs"})
            await existing_ws.close(code=1008)
        except Exception:
            pass
    
    manager.user_connections[user_id] = websocket

    # ws ya fue aceptado
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"user_state:{user_id}")
    
    pubsub_task = asyncio.create_task(listen_pubsub(websocket, pubsub))
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                import json
                payload = json.loads(data)
                if payload.get('type') == 'click_batch':
                    from app.db.database import AsyncSessionLocal
                    from app.api.v1.clicks import process_click_batch
                    from app.schemas.click import ClickBatch
                    async with AsyncSessionLocal() as db:
                        batch = ClickBatch(**payload['batch'])
                        await process_click_batch(batch, user_id, db)
            except Exception as e:
                print(f"Error parseando mensaje WS: {e}")
    except WebSocketDisconnect:
        pass
    finally:
        pubsub_task.cancel()
        await pubsub.unsubscribe(f"user_state:{user_id}")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Añadimos la columna en vivo en caso de que no exista
        try:
            await conn.execute(text("ALTER TABLE global_game_state ADD COLUMN unprocessed_clicks_for_prize INTEGER DEFAULT 0;"))
        except Exception:
            pass # Si ya existe fallará de forma segura
            
        # Añadimos el clan al usuario
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN clan_id INTEGER;"))
        except Exception:
            pass
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN session_clicks INTEGER DEFAULT 0;"))
        except Exception:
            pass
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN cooldown_until VARCHAR;"))
        except Exception:
            pass
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN clan_contribution BIGINT DEFAULT 0;"))
        except Exception:
            pass
            
    # (Ya no usamos ARQ pool porque todo es síncrono con Lua scripts)
    
    # Iniciar la tarea de sincronización en segundo plano
    asyncio.create_task(warmup_redis_cache())
    asyncio.create_task(sync_users_to_db())
    asyncio.create_task(sync_clicks_to_db())
    asyncio.create_task(ws_broadcast_task())
    asyncio.create_task(ws_events_task())

# Registramos los endpoints
app.include_router(clicks.router, prefix="/api/v1/clicks", tags=["Clicks"])
app.include_router(game.router, prefix="/api/v1/game", tags=["Game"])
app.include_router(shop.router, prefix="/api/v1/shop", tags=["Shop"])
app.include_router(social.router, prefix="/api/v1", tags=["Social"])
app.include_router(clans.router, prefix="/api/v1/clans", tags=["Clans"])
app.include_router(ads.router, prefix="/api/v1/ads", tags=["ads"])

@app.get("/")
def read_root():
    return {"message": "El Backend del Huevo está corriendo 🥚🚀"}

if __name__ == "__main__":
    # Lee el puerto que dicta Railway, o usa 8000 si estás en local
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)