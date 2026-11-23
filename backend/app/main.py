import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import close_client, ensure_indexes, get_db, ping
from app.errors import register_error_handlers
from app.routes import auth, collection_requests, dashboard, history, schedules, tasks, users
from app.services.bootstrap import ensure_admin_user

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("wcs")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await ensure_indexes()
        await ensure_admin_user(get_db())
        logger.info("Database ready")
    except Exception as exc:
        logger.error("Startup database tasks failed (%s). Check MONGODB_URI and Atlas network access.", type(exc).__name__)
    yield
    await close_client()


app = FastAPI(
    title="Waste Collection Scheduling and Tracking System API",
    version="1.0.0",
    description="Residents submit requests, personnel schedule, assign and complete collections.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=False,  # Bearer tokens are used, no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)

api = APIRouter(prefix="/api")
for module in (auth, collection_requests, schedules, tasks, history, dashboard, users):
    api.include_router(module.router)


@api.get("/health", tags=["System"])
async def health():
    connected = await ping()
    return {"success": True, "message": "ok", "data": {"status": "ok", "database": "connected" if connected else "unreachable"}}


app.include_router(api)


@app.get("/", include_in_schema=False)
async def root():
    return {"success": True, "message": "Waste Collection API is running. See /docs for the API reference."}
