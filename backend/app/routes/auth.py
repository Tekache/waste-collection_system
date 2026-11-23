import asyncio

from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from app.constants import Role
from app.database import get_db
from app.deps import get_current_user
from app.errors import ApiError
from app.schemas.auth import LoginIn, ProfileUpdate, RegisterIn
from app.security import create_access_token, hash_password, verify_password
from app.utils import ok, utcnow

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201, summary="Create a resident account")
async def register(payload: RegisterIn):
    db = get_db()
    now = utcnow()
    user = {
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "password_hash": await asyncio.to_thread(hash_password, payload.password),
        "role": Role.resident.value,
        "phone": payload.phone,
        "address": payload.address,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError:
        raise ApiError(409, "An account with this email already exists.", "EMAIL_TAKEN")
    user["_id"] = result.inserted_id
    return ok({"token": create_access_token(user), "user": user}, "Account created successfully")


@router.post("/login", summary="Sign in and receive an access token")
async def login(payload: LoginIn):
    user = await get_db().users.find_one({"email": payload.email.lower()})
    valid = user is not None and await asyncio.to_thread(verify_password, payload.password, user["password_hash"])
    if not valid:
        raise ApiError(401, "Incorrect email or password.", "INVALID_CREDENTIALS")
    if not user.get("is_active", True):
        raise ApiError(403, "This account has been deactivated. Contact an administrator.", "ACCOUNT_DISABLED")
    return ok({"token": create_access_token(user), "user": user}, "Signed in successfully")


@router.get("/me", summary="Current user")
async def me(user: dict = Depends(get_current_user)):
    return ok(user)


@router.patch("/me", summary="Update own profile (role cannot be changed here)")
async def update_me(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return ok(user, "Nothing to update")
    updated = await get_db().users.find_one_and_update(
        {"_id": user["_id"]}, {"$set": {**changes, "updated_at": utcnow()}}, return_document=True
    )
    return ok(updated, "Profile updated")
