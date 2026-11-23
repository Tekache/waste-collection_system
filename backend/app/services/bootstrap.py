import logging

from app.config import get_settings
from app.constants import Role
from app.security import hash_password
from app.utils import utcnow

logger = logging.getLogger("wcs")


async def ensure_admin_user(db) -> None:
    settings = get_settings()
    if not settings.admin_email or not settings.admin_password:
        return
    email = settings.admin_email.lower()
    if await db.users.find_one({"email": email}):
        return
    now = utcnow()
    await db.users.insert_one(
        {
            "full_name": settings.admin_name,
            "email": email,
            "password_hash": hash_password(settings.admin_password),
            "role": Role.admin.value,
            "phone": None,
            "address": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
    )
    logger.info("Initial administrator account created")
