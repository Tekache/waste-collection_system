import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("wcs")


class ApiError(Exception):
    def __init__(self, status_code: int, message: str, code: str = "ERROR"):
        self.status_code = status_code
        self.message = message
        self.code = code


def error_body(message: str, code: str, **extra) -> dict:
    return {"success": False, "message": message, "error": code, **extra}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.message, exc.code))

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        errors = []
        for item in exc.errors():
            field = ".".join(str(p) for p in item["loc"] if p not in ("body", "query", "path"))
            errors.append({"field": field, "message": str(item["msg"]).removeprefix("Value error, ")})
        return JSONResponse(
            status_code=422,
            content=error_body("Please correct the highlighted fields.", "VALIDATION_ERROR", errors=errors),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        message = "Resource not found." if exc.status_code == 404 else str(exc.detail)
        return JSONResponse(status_code=exc.status_code, content=error_body(message, "HTTP_ERROR"))

    @app.exception_handler(PyMongoError)
    async def database_error(_: Request, exc: PyMongoError):
        logger.error("Database error: %s", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content=error_body("The database is temporarily unavailable. Please try again.", "DATABASE_UNAVAILABLE"),
        )

    @app.exception_handler(Exception)
    async def unexpected_error(_: Request, exc: Exception):
        logger.exception("Unhandled error")
        return JSONResponse(status_code=500, content=error_body("An unexpected error occurred.", "INTERNAL_ERROR"))
