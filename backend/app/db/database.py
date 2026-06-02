import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv
import redis

load_dotenv()

# 1. Obtenemos la URL de la base de datos (por defecto la local si no existe la variable)
raw_db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/egg_db")

# 2. Reemplazamos el prefijo si viene de Railway (postgresql:// -> postgresql+asyncpg://)
if raw_db_url.startswith("postgresql://"):
    DATABASE_URL = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = raw_db_url

# 3. Inicializamos el motor con la URL corregida
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True, pool_recycle=300)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session