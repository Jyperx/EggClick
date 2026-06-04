import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()
engine = create_async_engine(os.getenv('DATABASE_URL'))

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE users ADD COLUMN contact_method VARCHAR;'))
        except Exception as e: print(e)
        try:
            await conn.execute(text('ALTER TABLE users ADD COLUMN contact_details VARCHAR;'))
        except Exception as e: print(e)
        try:
            await conn.execute(text('ALTER TABLE users ADD COLUMN contact_pin_hash VARCHAR;'))
        except Exception as e: print(e)

asyncio.run(main())
