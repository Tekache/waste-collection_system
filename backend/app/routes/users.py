import asyncio
import re

from fastapi import APIRouter, Depends, Query
from pymongo.errors import DuplicateKeyError

from app.constants import STAFF_ROLES, Role
from app.database import get_db
from app.deps import require_roles
from app.errors import ApiError
from app.schemas.auth import AdminUserCreate, AdminUserUpdate
from app.security import hash_password
from app.utils import ok, page_of, to_oid, utcnow

router = APIRouter(tags=["Users"])
admin_only = require_roles(Role.admin)


@router.get("/users/personnel", summary="Active personnel available for assignment")
async def personnel(_: dict = Depends(require_roles(*STAFF_ROLES))):
    cursor = get_db().users.find({"role": Role.personnel.value, "is_active": True}, {"full_name": 1, "email": 1}).sort("full_name", 1)
    return ok(await cursor.to_list(length=500))


@router.get("/admin/users", summary="List users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    role: Role | None = None,
    q: str | None = Query(None, max_length=100),
    _: dict = Depends(admin_only),
):
    query: dict = {}
    if role:
        query["role"] = role.value
    if q:
        pattern = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"full_name": pattern}, {"email": pattern}]
    db = get_db()
    total = await db.users.count_documents(query)
    cursor = db.users.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    return ok(page_of(await cursor.to_list(length=page_size), total, page, page_size))


@router.post("/admin/users", status_code=201, summary="Create a user with any role")
async def create_user(payload: AdminUserCreate, _: dict = Depends(admin_only)):
    now = utcnow()
    user = {
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "password_hash": await asyncio.to_thread(hash_password, payload.password),
        "role": payload.role.value,
        "phone": payload.phone,
        "address": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await get_db().users.insert_one(user)
    except DuplicateKeyError:
        raise ApiError(409, "An account with this email already exists.", "EMAIL_TAKEN")
    user["_id"] = result.inserted_id
    return ok(user, "User created")


@router.patch("/admin/users/{user_id}", summary="Change a user's role or active state")
async def update_user(user_id: str, payload: AdminUserUpdate, admin: dict = Depends(admin_only)):
    target_id = to_oid(user_id, "user id")
    if target_id == admin["_id"]:
        raise ApiError(400, "You cannot change your own role or deactivate your own account.", "SELF_MODIFICATION")
    changes = {}
    if payload.role is not None:
        changes["role"] = payload.role.value
    if payload.is_active is not None:
        changes["is_active"] = payload.is_active
    if not changes:
        raise ApiError(400, "Nothing to update.", "NO_CHANGES")
    updated = await get_db().users.find_one_and_update(
        {"_id": target_id}, {"$set": {**changes, "updated_at": utcnow()}}, return_document=True
    )
    if updated is None:
        raise ApiError(404, "User not found.", "NOT_FOUND")
    return ok(updated, "User updated")
