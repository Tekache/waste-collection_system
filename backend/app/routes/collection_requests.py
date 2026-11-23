from datetime import date

from fastapi import APIRouter, Depends, Query

from app.constants import RequestStatus, Role
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.schemas.requests import RequestCreate, RequestUpdate
from app.services import requests as svc
from app.utils import ok

router = APIRouter(prefix="/requests", tags=["Collection requests"])


@router.post("", status_code=201, summary="Submit a collection request (residents)")
async def create(payload: RequestCreate, user: dict = Depends(require_roles(Role.resident))):
    doc = await svc.create_request(get_db(), user, payload)
    return ok(doc, "Collection request submitted successfully")


@router.get("", summary="List requests (residents see only their own)")
async def list_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: RequestStatus | None = None,
    q: str | None = Query(None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    user: dict = Depends(get_current_user),
):
    query = svc.build_query(user, status=status.value if status else None, q=q, date_from=date_from, date_to=date_to)
    return ok(await svc.paginate_requests(get_db(), query, page, page_size))


@router.get("/{request_id}", summary="Request details with timeline")
async def get_one(request_id: str, user: dict = Depends(get_current_user)):
    return ok(await svc.get_request(get_db(), request_id, user))


@router.patch("/{request_id}", summary="Edit a pending request or cancel it")
async def patch(request_id: str, payload: RequestUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    request = await svc.get_request(db, request_id, user)
    if payload.status == "Cancelled":
        return ok(await svc.cancel_request(db, user, request, payload.cancel_reason), "Request cancelled")
    changes = payload.model_dump(exclude_unset=True, exclude={"status", "cancel_reason"})
    return ok(await svc.update_details(db, user, request, changes), "Request updated")
