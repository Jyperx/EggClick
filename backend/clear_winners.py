import asyncio
from app.db.redis import redis_client

async def main():
    await redis_client.delete('winners_contact_info')
    await redis_client.delete('global_egg_season_winners')
    await redis_client.aclose()
    print("Done")

if __name__ == "__main__":
    asyncio.run(main())
