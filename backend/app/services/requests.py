import re

from pymongo import ReturnDocument

from app.constants import FINAL_STATUSES, OPEN_TASK_STATUSES, RequestStatus, Role
from app.errors import ApiError
from app.utils import page_of, to_oid, utcnow


def make_event(status: str, note: str | None, user: dict) -> dict:
    return {"status": status, "note": note or "", "by": user["full_name"], "at": utcnow()}


async def next_reference(db) -> str:
    year = utcnow().year
    counter = await db.counters.find_one_and_update(
        {"_id": f"request-{year}"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return f"WCS-{year}-{counter['seq']:05d}"


async def create_request(db, user: dict, payload) -> dict:
    now = utcnow()
    doc = {
        "reference": await next_reference(db),
        "requester_id": user["_id"],
        "requester_name": user["full_name"],
        "requester_email": user["email"],
        "requester_phone": user.get("phone"),
        "collection_address": payload.collection_address,
        "waste_type": payload.waste_type.value,
        "description": payload.description,
        "preferred_date": payload.preferred_date.isoformat(),
        "preferred_time_window": payload.preferred_time_window.value,
        "notes": payload.notes,
        "status": RequestStatus.PENDING.value,
        "schedule": None,
        "assignment": None,
        "timeline": [make_event(RequestStatus.PENDING.value, "Request submitted", user)],
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }
    result = await db.collection_requests.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def build_query(user: dict, *, statuses=None, status=None, q=None, date_from=None, date_to=None) -> dict:
    query: dict = {}
    if user["role"] == Role.resident.value:
        query["requester_id"] = user["_id"]
    if status:
        query["status"] = status
    elif statuses:
        query["status"] = {"$in": statuses}
    if q:
        pattern = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"reference": pattern}, {"collection_address": pattern}, {"requester_name": pattern}]
    if date_from or date_to:
        query["preferred_date"] = {}
        if date_from:
            query["preferred_date"]["$gte"] = date_from.isoformat()
        if date_to:
            query["preferred_date"]["$lte"] = date_to.isoformat()
    return query


async def paginate_requests(db, query: dict, page: int, page_size: int, sort_field: str = "created_at") -> dict:
    total = await db.collection_requests.count_documents(query)
    cursor = (
        db.collection_requests.find(query, {"timeline": 0})
        .sort(sort_field, -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    return page_of(await cursor.to_list(length=page_size), total, page, page_size)


async def get_request(db, request_id: str, user: dict | None = None) -> dict:
    query = {"_id": to_oid(request_id, "request id")}
    if user is not None and user["role"] == Role.resident.value:
        query["requester_id"] = user["_id"]
    doc = await db.collection_requests.find_one(query)
    if doc is None:
        raise ApiError(404, "Collection request not found.", "NOT_FOUND")
    return doc


async def transition(db, request_id, set_fields: dict, event: dict, expected) -> dict:
    """Atomically move a request to a new state only if it is still in the expected state."""
    expected_list = expected if isinstance(expected, list) else [expected]
    doc = await db.collection_requests.find_one_and_update(
        {"_id": request_id, "status": {"$in": expected_list}},
        {"$set": {**set_fields, "updated_at": utcnow()}, "$push": {"timeline": event}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise ApiError(409, "This request was just updated by someone else. Refresh and try again.", "INVALID_TRANSITION")
    return doc


async def update_details(db, user: dict, request: dict, changes: dict) -> dict:
    if request["requester_id"] != user["_id"]:
        raise ApiError(403, "Only the requester can edit this request.", "FORBIDDEN")
    if request["status"] != RequestStatus.PENDING.value:
        raise ApiError(409, "Only pending requests can be edited.", "INVALID_TRANSITION")
    values = {}
    for key, value in changes.items():
        values[key] = value.isoformat() if hasattr(value, "isoformat") else getattr(value, "value", value)
    if not values:
        return request
    return await transition(
        db, request["_id"], values, make_event(RequestStatus.PENDING.value, "Request details updated", user), RequestStatus.PENDING.value
    )


async def cancel_request(db, user: dict, request: dict, reason: str | None) -> dict:
    is_resident = user["role"] == Role.resident.value
    if is_resident and request["requester_id"] != user["_id"]:
        raise ApiError(403, "You cannot cancel this request.", "FORBIDDEN")
    cancellable = [RequestStatus.PENDING.value, RequestStatus.SCHEDULED.value]
    if not is_resident:
        cancellable += OPEN_TASK_STATUSES
    if request["status"] in FINAL_STATUSES or request["status"] not in cancellable:
        raise ApiError(409, f"A request that is {request['status']} can no longer be cancelled.", "INVALID_TRANSITION")

    updated = await transition(
        db,
        request["_id"],
        {"status": RequestStatus.CANCELLED.value, "assignment": None},
        make_event(RequestStatus.CANCELLED.value, reason or "Request cancelled", user),
        request["status"],
    )
    await db.tasks.update_many(
        {"request_id": request["_id"], "status": {"$in": OPEN_TASK_STATUSES}},
        {"$set": {"status": RequestStatus.CANCELLED.value, "updated_at": utcnow()}},
    )
    return updated
