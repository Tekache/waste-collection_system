from datetime import date

from fastapi import APIRouter, Depends, Query

from app.constants import ACTIVE_STATUSES, STAFF_ROLES
from app.database import get_db
from app.deps import require_roles
from app.errors import ApiError
from app.schemas.requests import ScheduleCreate, ScheduleUpdate
from app.services import workflow
from app.utils import ok, page_of, to_oid

router = APIRouter(prefix="/schedules", tags=["Scheduling"])
staff = require_roles(*STAFF_ROLES)


@router.post("", status_code=201, summary="Schedule a pending request")
async def create(payload: ScheduleCreate, user: dict = Depends(staff)):
    return ok(await workflow.schedule_request(get_db(), user, payload), "Collection scheduled")


@router.get("", summary="Upcoming and active schedules with their request")
async def list_schedules(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    date_from: date | None = None,
    date_to: date | None = None,
    active_only: bool = True,
    _: dict = Depends(staff),
):
    match: dict = {}
    if date_from or date_to:
        match["scheduled_date"] = {}
        if date_from:
            match["scheduled_date"]["$gte"] = date_from.isoformat()
        if date_to:
            match["scheduled_date"]["$lte"] = date_to.isoformat()
    pipeline: list[dict] = [
        {"$match": match},
        {"$lookup": {"from": "collection_requests", "localField": "request_id", "foreignField": "_id", "as": "request"}},
        {"$unwind": "$request"},
        {"$project": {"request.timeline": 0}},
    ]
    if active_only:
        pipeline.append({"$match": {"request.status": {"$in": ACTIVE_STATUSES}}})
    pipeline += [
        {"$sort": {"scheduled_date": 1, "time_window": 1}},
        {"$facet": {"items": [{"$skip": (page - 1) * page_size}, {"$limit": page_size}], "total": [{"$count": "n"}]}},
    ]
    cursor = await get_db().schedules.aggregate(pipeline)
    result = (await cursor.to_list(length=1))[0]
    total = result["total"][0]["n"] if result["total"] else 0
    return ok(page_of(result["items"], total, page, page_size))


@router.get("/{schedule_id}", summary="One schedule")
async def get_one(schedule_id: str, _: dict = Depends(staff)):
    schedule = await get_db().schedules.find_one({"_id": to_oid(schedule_id, "schedule id")})
    if schedule is None:
        raise ApiError(404, "Schedule not found.", "NOT_FOUND")
    return ok(schedule)


@router.patch("/{schedule_id}", summary="Reschedule a collection")
async def patch(schedule_id: str, payload: ScheduleUpdate, user: dict = Depends(staff)):
    return ok(await workflow.update_schedule(get_db(), user, schedule_id, payload), "Schedule updated")
