import redis.asyncio as redis
from ..config import settings

# Create async Redis client
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def get_redis():
    try:
        yield redis_client
    finally:
        pass  # Redis connection will be handled by the client
