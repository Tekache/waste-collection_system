from datetime import datetime, timezone
from math import ceil

from bson import ObjectId
from bson.errors import InvalidId

from app.errors import ApiError

HIDDEN_FIELDS = {"password_hash"}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def today_iso() -> str:
    return utcnow().date().isoformat()


def to_oid(value, label: str = "id") -> ObjectId:
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        raise ApiError(400, f"Invalid {label}.", "INVALID_ID")


def serialize(value):
    """Convert Mongo documents into JSON-safe structures (ObjectId and datetime become strings)."""
    if isinstance(value, dict):
        return {("id" if k == "_id" else k): serialize(v) for k, v in value.items() if k not in HIDDEN_FIELDS}
    if isinstance(value, list):
        return [serialize(v) for v in value]
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()
    return value


def ok(data=None, message: str = "Success") -> dict:
    return {"success": True, "message": message, "data": serialize(data)}


def page_of(items: list, total: int, page: int, page_size: int) -> dict:
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": max(1, ceil(total / page_size))}
