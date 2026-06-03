import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL)

async def alter():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE global_game_state ADD COLUMN season_mode VARCHAR DEFAULT 'ganador_absoluto'"))
            print("Columna agregada correctamente")
        except Exception as e:
            print(f"Error o la columna ya existe: {e}")

asyncio.run(alter())
