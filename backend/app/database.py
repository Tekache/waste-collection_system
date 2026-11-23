import logging

from pymongo import ASCENDING, AsyncMongoClient

from app.config import get_settings

logger = logging.getLogger("wcs")
_client: AsyncMongoClient | None = None


def get_client() -> AsyncMongoClient:
    global _client
    if _client is None:
        _client = AsyncMongoClient(get_settings().mongodb_uri, tz_aware=True, serverSelectionTimeoutMS=10000)
    return _client


def get_db():
    return get_client()[get_settings().database_name]


async def ping() -> bool:
    try:
        await get_client().admin.command("ping")
        return True
    except Exception:
        return False


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.collection_requests.create_index("reference", unique=True)
    await db.collection_requests.create_index([("requester_id", ASCENDING), ("created_at", -1)])
    await db.collection_requests.create_index([("status", ASCENDING), ("created_at", -1)])
    await db.collection_requests.create_index("preferred_date")
    await db.schedules.create_index("request_id", unique=True)
    await db.schedules.create_index("scheduled_date")
    await db.tasks.create_index([("personnel_id", ASCENDING), ("status", ASCENDING)])
    await db.tasks.create_index("request_id")


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
