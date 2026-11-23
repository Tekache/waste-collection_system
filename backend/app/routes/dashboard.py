from fastapi import APIRouter, Depends

from app.constants import ACTIVE_STATUSES, OPEN_TASK_STATUSES, RequestStatus, Role
from app.database import get_db
from app.deps import get_current_user
from app.utils import ok, today_iso

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", summary="Counts, recent requests and upcoming collections for the current role")
async def stats(user: dict = Depends(get_current_user)):
    db = get_db()
    scope: dict = {}
    upcoming_scope: dict = {}
    if user["role"] == Role.resident.value:
        scope = upcoming_scope = {"requester_id": user["_id"]}
    elif user["role"] == Role.personnel.value:
        upcoming_scope = {"assignment.personnel_id": user["_id"]}

    grouped = await (await db.collection_requests.aggregate([{"$match": scope}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}])).to_list(length=20)
    counts = {s.value: 0 for s in RequestStatus}
    counts.update({g["_id"]: g["count"] for g in grouped})

    recent = await db.collection_requests.find(scope, {"timeline": 0}).sort("created_at", -1).limit(5).to_list(length=5)
    upcoming = (
        await db.collection_requests.find(
            {**upcoming_scope, "status": {"$in": ACTIVE_STATUSES}, "schedule.scheduled_date": {"$gte": today_iso()}}, {"timeline": 0}
        )
        .sort("schedule.scheduled_date", 1)
        .limit(5)
        .to_list(length=5)
    )
    data = {"counts": counts, "total": sum(counts.values()), "recent": recent, "upcoming": upcoming}
    if user["role"] == Role.personnel.value:
        data["my_open_tasks"] = await db.tasks.count_documents({"personnel_id": user["_id"], "status": {"$in": OPEN_TASK_STATUSES}})
    return ok(data)
