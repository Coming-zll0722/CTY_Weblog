import json
import logging
import re
import time
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import AppError
from app.services.content_cache import public_content_cache

settings = get_settings()
logging.basicConfig(level=settings.log_level, format="%(message)s")
logger = logging.getLogger("cty-log")

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.app_env != "production" else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID"],
)
if settings.app_env == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$")


@app.middleware("http")
async def request_context(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    supplied_request_id = request.headers.get("x-request-id", "")
    request_id = (
        supplied_request_id
        if REQUEST_ID_PATTERN.fullmatch(supplied_request_id)
        else str(uuid4())
    )
    request.state.request_id = request_id
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    path = request.url.path
    if (
        request.method in {"POST", "PATCH", "PUT", "DELETE"}
        and path.startswith("/api/v1/admin")
        and response.status_code < 400
    ):
        public_content_cache.invalidate()
    public_get_prefixes = (
        "/api/v1/posts",
        "/api/v1/projects",
        "/api/v1/timelines",
        "/api/v1/search",
        "/api/v1/categories",
        "/api/v1/tags",
        "/api/v1/links",
        "/api/v1/settings/public",
    )
    if request.method == "GET" and path.startswith(public_get_prefixes):
        response.headers["Cache-Control"] = (
            "public, max-age=60, stale-while-revalidate=240"
        )
    elif not path.startswith("/api/v1/media/"):
        response.headers["Cache-Control"] = "no-store"
    logger.info(
        json.dumps({
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        }, ensure_ascii=False)
    )
    return response


def error_response(
    request: Request, status_code: int, code: str, message: str
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "request_id": getattr(request.state, "request_id", None),
            },
        },
    )


@app.exception_handler(AppError)
async def app_error(request: Request, exc: AppError) -> Response:
    if exc.status_code == 301:
        return RedirectResponse(exc.message, status_code=301)
    return error_response(request, exc.status_code, exc.code, exc.message)


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
    code = {
        401: "AUTH_REQUIRED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        413: "UPLOAD_TOO_LARGE",
        415: "UPLOAD_TYPE_DENIED",
    }.get(exc.status_code, "HTTP_ERROR")
    return error_response(request, exc.status_code, code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response(request, 422, "VALIDATION_ERROR", "请求参数无效。")


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    message = json.dumps(
        {"request_id": request_id, "error_type": type(exc).__name__},
        ensure_ascii=False,
    )
    if settings.app_env == "production":
        logger.error(message)
    else:
        logger.exception(message)
    return error_response(request, 500, "INTERNAL_ERROR", "服务暂时不可用。")


app.include_router(router, prefix=settings.api_prefix)
