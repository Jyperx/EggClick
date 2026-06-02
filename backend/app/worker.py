import asyncio
import os
from arq import Worker
from app.db.database import get_db, AsyncSessionLocal
from app.api.v1.clicks import process_click_batch
from app.schemas.click import ClickBatch
from app.db.redis import redis_client

async def startup(ctx):
    print("Worker started")
    ctx['session_maker'] = AsyncSessionLocal
    ctx['redis'] = redis_client

async def shutdown(ctx):
    print("Worker stopped")

async def process_clicks_job(ctx, batch_data: dict, user_id: str):
    print(f"Processing clicks for {user_id}")
    batch = ClickBatch(**batch_data)
    
    # Abrir sesión manualmente para el worker
    async with ctx['session_maker']() as db:
        # Llamamos a la misma lógica de clicks que ya teníamos
        result = await process_click_batch(batch, user_id, db)
        
        import json
        await ctx['redis'].publish(f"user_state:{user_id}", json.dumps(result))
        
        # Publicar evento global si se sumaron clics reales
        if result.get("status") == "success" and result.get("added", 0) > 0:
            # Extraer el username real desde el estado en Redis
            user_state_key = f"user_state:{user_id}"
            state = await ctx['redis'].hgetall(user_state_key)
            username = state.get("username", user_id.split('@')[0])
            
            event = {
                "type": "user_click",
                "username": username,
                "clicks": result.get("added")
            }
            await ctx['redis'].publish("global_events", json.dumps(event))
        
    return result

async def process_egg_broken(ctx, user_id: str, winner_name: str):
    import json
    from sqlalchemy.future import select
    from app.models.game import GlobalGameState
    
    print(f"!!! EGG BROKEN BY {winner_name} ({user_id}) !!!")
    
    async with ctx['session_maker']() as db:
        # Encontrar el estado activo y marcarlo como inactivo
        result = await db.execute(select(GlobalGameState).where(GlobalGameState.is_active == True))
        state = result.scalars().first()
        
        if state:
            state.is_active = False
            state.current_clicks = state.total_clicks_required # Asegurar que llegó al máximo
            # Aquí podrías guardar quién fue el ganador en una nueva tabla de historial de temporadas
            await db.commit()
            print(f"Season {state.current_clicks} ended. Prize: {state.prize_pool_usd} USD.")
            
    # El juego queda en estado 'broken'. El admin console deberá iniciar la nueva temporada.

from arq.connections import RedisSettings
from dotenv import load_dotenv

load_dotenv()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

_settings = RedisSettings.from_dsn(REDIS_URL)

class WorkerSettings:
    functions = [process_clicks_job, process_egg_broken]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
    poll_delay = 0.05
