import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.constants import Role
from app.database import get_db
from app.errors import ApiError
from app.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    if credentials is None:
        raise ApiError(401, "Please sign in to continue.", "NOT_AUTHENTICATED")
    try:
        payload = decode_token(credentials.credentials)
        user_id = ObjectId(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "Your session has expired. Please sign in again.", "TOKEN_EXPIRED")
    except (jwt.PyJWTError, KeyError, InvalidId):
        raise ApiError(401, "Your session is invalid. Please sign in again.", "INVALID_TOKEN")

    user = await get_db().users.find_one({"_id": user_id})
    if user is None or not user.get("is_active", True):
        raise ApiError(401, "This account is no longer available.", "NOT_AUTHENTICATED")
    return user


def require_roles(*roles: Role):
    allowed = {r.value for r in roles}

    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed:
            raise ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN")
        return user

    return checker
