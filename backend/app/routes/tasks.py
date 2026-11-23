from fastapi import APIRouter, Depends, Query

from app.constants import STAFF_ROLES, RequestStatus, Role
from app.database import get_db
from app.deps import require_roles
from app.schemas.requests import TaskCreate, TaskUpdate
from app.services import workflow
from app.utils import ok, page_of

router = APIRouter(prefix="/tasks", tags=["Task assignment"])
staff = require_roles(*STAFF_ROLES)


@router.post("", status_code=201, summary="Assign personnel to a scheduled request")
async def create(payload: TaskCreate, user: dict = Depends(staff)):
    return ok(await workflow.assign_task(get_db(), user, payload), "Task assigned")


@router.get("", summary="List tasks (personnel see only their own)")
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: RequestStatus | None = None,
    user: dict = Depends(staff),
):
    query: dict = {}
    if user["role"] == Role.personnel.value:
        query["personnel_id"] = user["_id"]
    if status:
        query["status"] = status.value
    db = get_db()
    total = await db.tasks.count_documents(query)
    cursor = db.tasks.find(query).sort([("request_snapshot.scheduled_date", 1), ("created_at", -1)]).skip((page - 1) * page_size).limit(page_size)
    return ok(page_of(await cursor.to_list(length=page_size), total, page, page_size))


@router.get("/{task_id}", summary="One task")
async def get_one(task_id: str, user: dict = Depends(staff)):
    return ok(await workflow.get_task(get_db(), user, task_id))


@router.patch("/{task_id}", summary="Update task status, notes or assignee")
async def patch(task_id: str, payload: TaskUpdate, user: dict = Depends(staff)):
    return ok(await workflow.update_task(get_db(), user, task_id, payload), "Task updated")
