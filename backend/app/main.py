from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from loguru import logger

from app.api.v1 import api_router
from app.core.config import settings
from app.core.constants import API_V1_STR
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestLifecycleMiddleware
from app.core.security import (
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_HEADERS,
    CORS_ALLOW_METHODS,
    CORS_ORIGINS,
    TRUSTED_HOSTS,
)
from app.database.firestore import initialize_firestore
from app.database.storage import initialize_storage
from app.services.sarvam.mcp.provider import SarvamProvider


# --- Lifespan Setup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} in environment: {settings.ENVIRONMENT}")

    # Ensure all local runtime directories exist
    for dir_name in ["logs", settings.UPLOAD_FOLDER, "generated", "temp", "data"]:
        Path(dir_name).mkdir(exist_ok=True)
    logger.info("Local environment runtime folders verified.")

    # Initialize external DB & Cloud clients
    initialize_firestore()
    initialize_storage()

    # Startup Sarvam MCP Client
    try:
        await SarvamProvider.startup()
    except Exception as e:
        logger.error(f"Error starting Sarvam MCP subsystem: {e}")

    yield

    # Shutdown Events
    logger.info(f"Shutting down {settings.APP_NAME}...")
    try:
        await SarvamProvider.shutdown()
    except Exception as e:
        logger.error(f"Error shutting down Sarvam MCP subsystem: {e}")


# --- Application Factory ---
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # 1. Trusted Host Middleware
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=TRUSTED_HOSTS)

    # 2. GZip Compression Middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # 3. Custom Request ID, Execution Timer & Logging Middleware
    app.add_middleware(RequestLifecycleMiddleware)

    # 4. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=CORS_ALLOW_CREDENTIALS,
        allow_methods=CORS_ALLOW_METHODS,
        allow_headers=CORS_ALLOW_HEADERS,
    )

    # 5. Global Exception Handlers
    register_exception_handlers(app)

    # 6. Include Router
    app.include_router(api_router, prefix=API_V1_STR)

    return app


app = create_app()
