from datetime import date

from fastapi import APIRouter, Depends, Query

from app.constants import FINAL_STATUSES, RequestStatus
from app.database import get_db
from app.deps import get_current_user
from app.services import requests as svc
from app.utils import ok

router = APIRouter(prefix="/history", tags=["History"])


@router.get("", summary="Completed and cancelled collections")
async def history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: RequestStatus | None = None,
    q: str | None = Query(None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    user: dict = Depends(get_current_user),
):
    chosen = status.value if status in (RequestStatus.COMPLETED, RequestStatus.CANCELLED) else None
    query = svc.build_query(user, statuses=FINAL_STATUSES, status=chosen, q=q, date_from=date_from, date_to=date_to)
    return ok(await svc.paginate_requests(get_db(), query, page, page_size, sort_field="updated_at"))
