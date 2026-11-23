from pymongo.errors import DuplicateKeyError

from app.constants import OPEN_TASK_STATUSES, RequestStatus, Role
from app.errors import ApiError
from app.services.requests import get_request, make_event, transition
from app.utils import to_oid, utcnow

S = RequestStatus


async def schedule_request(db, user: dict, payload) -> dict:
    request = await get_request(db, payload.request_id)
    if request["status"] != S.PENDING.value:
        raise ApiError(409, "Only pending requests can be scheduled. Reschedule existing schedules instead.", "INVALID_TRANSITION")

    now = utcnow()
    schedule = {
        "request_id": request["_id"],
        "request_reference": request["reference"],
        "scheduled_date": payload.scheduled_date.isoformat(),
        "time_window": payload.time_window.value,
        "notes": payload.notes,
        "created_by": user["_id"],
        "created_by_name": user["full_name"],
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.schedules.insert_one(schedule)
    except DuplicateKeyError:
        raise ApiError(409, "This request already has a schedule.", "DUPLICATE")
    schedule["_id"] = result.inserted_id

    summary = {
        "schedule_id": result.inserted_id,
        "scheduled_date": schedule["scheduled_date"],
        "time_window": schedule["time_window"],
        "notes": payload.notes,
    }
    note = f"Collection scheduled for {schedule['scheduled_date']} ({schedule['time_window']})"
    try:
        await transition(db, request["_id"], {"status": S.SCHEDULED.value, "schedule": summary}, make_event(S.SCHEDULED.value, note, user), S.PENDING.value)
    except ApiError:
        await db.schedules.delete_one({"_id": result.inserted_id})
        raise
    return schedule


async def update_schedule(db, user: dict, schedule_id: str, payload) -> dict:
    schedule = await db.schedules.find_one({"_id": to_oid(schedule_id, "schedule id")})
    if schedule is None:
        raise ApiError(404, "Schedule not found.", "NOT_FOUND")
    request = await get_request(db, str(schedule["request_id"]))
    if request["status"] not in (S.SCHEDULED.value, S.ASSIGNED.value):
        raise ApiError(409, "Only scheduled or assigned collections can be rescheduled.", "INVALID_TRANSITION")

    changes = {}
    if payload.scheduled_date is not None:
        changes["scheduled_date"] = payload.scheduled_date.isoformat()
    if payload.time_window is not None:
        changes["time_window"] = payload.time_window.value
    if "notes" in payload.model_fields_set:
        changes["notes"] = payload.notes
    if not changes:
        return schedule

    now = utcnow()
    updated = await db.schedules.find_one_and_update(
        {"_id": schedule["_id"]}, {"$set": {**changes, "updated_at": now}}, return_document=True
    )
    request_fields = {f"schedule.{k}": v for k, v in changes.items()}
    note = f"Collection rescheduled to {updated['scheduled_date']} ({updated['time_window']})"
    await transition(db, request["_id"], request_fields, make_event(request["status"], note, user), request["status"])
    task_fields = {f"request_snapshot.{k}": v for k, v in changes.items() if k != "notes"}
    if task_fields:
        await db.tasks.update_many({"request_id": request["_id"], "status": {"$in": OPEN_TASK_STATUSES}}, {"$set": task_fields})
    return updated


async def _get_assignee(db, personnel_id: str) -> dict:
    person = await db.users.find_one({"_id": to_oid(personnel_id, "personnel id")})
    if person is None or person["role"] != Role.personnel.value or not person.get("is_active", True):
        raise ApiError(400, "Choose an active waste management personnel member.", "INVALID_ASSIGNEE")
    return person


async def assign_task(db, user: dict, payload) -> dict:
    request = await get_request(db, payload.request_id)
    if request["status"] != S.SCHEDULED.value:
        raise ApiError(409, "Schedule the request before assigning personnel.", "INVALID_TRANSITION")
    person = await _get_assignee(db, payload.personnel_id)

    now = utcnow()
    task = {
        "request_id": request["_id"],
        "request_reference": request["reference"],
        "personnel_id": person["_id"],
        "personnel_name": person["full_name"],
        "status": S.ASSIGNED.value,
        "notes": payload.notes,
        "request_snapshot": {
            "collection_address": request["collection_address"],
            "waste_type": request["waste_type"],
            "requester_name": request["requester_name"],
            "scheduled_date": request["schedule"]["scheduled_date"],
            "time_window": request["schedule"]["time_window"],
        },
        "assigned_by": user["_id"],
        "created_at": now,
        "updated_at": now,
        "started_at": None,
        "completed_at": None,
    }
    result = await db.tasks.insert_one(task)
    task["_id"] = result.inserted_id
    assignment = {"task_id": result.inserted_id, "personnel_id": person["_id"], "personnel_name": person["full_name"]}
    try:
        await transition(db, request["_id"], {"status": S.ASSIGNED.value, "assignment": assignment}, make_event(S.ASSIGNED.value, f"Assigned to {person['full_name']}", user), S.SCHEDULED.value)
    except ApiError:
        await db.tasks.delete_one({"_id": result.inserted_id})
        raise
    return task


TASK_TRANSITIONS = {
    S.ASSIGNED.value: {S.IN_PROGRESS.value, S.CANCELLED.value},
    S.IN_PROGRESS.value: {S.COMPLETED.value, S.CANCELLED.value},
}


async def update_task(db, user: dict, task_id: str, payload) -> dict:
    task = await get_task(db, user, task_id)
    now = utcnow()
    request_id = task["request_id"]

    if payload.personnel_id:
        if task["status"] != S.ASSIGNED.value:
            raise ApiError(409, "Only tasks that have not started can be reassigned.", "INVALID_TRANSITION")
        person = await _get_assignee(db, payload.personnel_id)
        task = await db.tasks.find_one_and_update(
            {"_id": task["_id"]},
            {"$set": {"personnel_id": person["_id"], "personnel_name": person["full_name"], "updated_at": now}},
            return_document=True,
        )
        assignment = {"task_id": task["_id"], "personnel_id": person["_id"], "personnel_name": person["full_name"]}
        await transition(db, request_id, {"assignment": assignment}, make_event(S.ASSIGNED.value, f"Reassigned to {person['full_name']}", user), S.ASSIGNED.value)

    if payload.status:
        if payload.status not in TASK_TRANSITIONS.get(task["status"], set()):
            raise ApiError(409, f"A {task['status']} task cannot move to {payload.status}.", "INVALID_TRANSITION")
        task_fields = {"status": payload.status, "updated_at": now}
        if payload.notes is not None:
            task_fields["notes"] = payload.notes
        if payload.status == S.IN_PROGRESS.value:
            task_fields["started_at"] = now
            await transition(db, request_id, {"status": S.IN_PROGRESS.value}, make_event(S.IN_PROGRESS.value, "Collection started", user), S.ASSIGNED.value)
        elif payload.status == S.COMPLETED.value:
            task_fields["completed_at"] = now
            await transition(db, request_id, {"status": S.COMPLETED.value, "completed_at": now}, make_event(S.COMPLETED.value, payload.notes or "Collection completed", user), S.IN_PROGRESS.value)
        else:
            await transition(db, request_id, {"status": S.SCHEDULED.value, "assignment": None}, make_event(S.SCHEDULED.value, "Task unassigned, awaiting reassignment", user), OPEN_TASK_STATUSES)
        task = await db.tasks.find_one_and_update({"_id": task["_id"]}, {"$set": task_fields}, return_document=True)
    elif payload.notes is not None:
        task = await db.tasks.find_one_and_update({"_id": task["_id"]}, {"$set": {"notes": payload.notes, "updated_at": now}}, return_document=True)
    return task


async def get_task(db, user: dict, task_id: str) -> dict:
    task = await db.tasks.find_one({"_id": to_oid(task_id, "task id")})
    if task is None:
        raise ApiError(404, "Task not found.", "NOT_FOUND")
    if user["role"] == Role.personnel.value and task["personnel_id"] != user["_id"]:
        raise ApiError(403, "This task is assigned to someone else.", "FORBIDDEN")
    return task
