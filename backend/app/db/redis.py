import os
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Conexión asíncrona a Redis (ideal para Railway y alta concurrencia)
redis_client = redis.from_url(REDIS_URL, decode_responses=True, health_check_interval=30)
