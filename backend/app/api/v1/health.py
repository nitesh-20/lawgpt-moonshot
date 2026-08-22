from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.database.firestore import initialize_firestore
from app.database.storage import initialize_storage

router = APIRouter()


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    environment: str = Field(..., examples=["development"])


class ReadyResponse(BaseModel):
    status: str = Field(..., examples=["ready"])
    services: dict = Field(
        ..., examples=[{"firestore": "connected", "storage": "connected"}]
    )


class VersionResponse(BaseModel):
    name: str = Field(..., examples=["LawGPT AI OS Backend"])
    version: str = Field(..., examples=["0.1.0"])


@router.get("/", response_model=VersionResponse)
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION}


@router.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}


@router.get("/ready", response_model=ReadyResponse)
async def ready():
    # Evaluate connectivity status of services
    firestore_client = initialize_firestore()
    storage_client = initialize_storage()

    firestore_status = (
        "connected" if firestore_client is not None else "mocked/disconnected"
    )
    storage_status = (
        "connected" if storage_client is not None else "mocked/disconnected"
    )

    return {
        "status": "ready",
        "services": {"firestore": firestore_status, "storage": storage_status},
    }


@router.get("/live", response_model=HealthResponse)
async def live():
    return {"status": "live", "environment": settings.ENVIRONMENT}


@router.get("/version", response_model=VersionResponse)
async def version():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION}
