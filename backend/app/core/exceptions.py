from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel, Field

# --- Error Schemas ---


class ErrorResponseDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable description of the error")
    details: dict[str, Any] | None = Field(
        default=None, description="Optional metadata or context details about the error"
    )


class ErrorResponse(BaseModel):
    success: bool = Field(default=False)
    error: ErrorResponseDetail


# --- Exception Definitions ---


class AppException(Exception):
    """Base exception for all application errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class ValidationException(AppException):
    """Raised when request validation or input checks fail."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class EntityNotFoundException(AppException):
    """Raised when a requested database entity or file is not found."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ServiceException(AppException):
    """Raised when third-party services (Sarvam AI, Gemini, Firebase) fail or return an error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            code="SERVICE_UNAVAILABLE",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details,
        )


# --- Exception Handler Registry ---


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request, exc: AppException
    ) -> JSONResponse:
        logger.warning(
            f"AppException occurred: {exc.code} - {exc.message} | Details: {exc.details}"
        )
        content = ErrorResponse(
            error=ErrorResponseDetail(
                code=exc.code, message=exc.message, details=exc.details
            )
        ).model_dump()
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("An unhandled exception occurred in the application.")
        content = ErrorResponse(
            error=ErrorResponseDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected system error occurred. Please try again later.",
                details={"error_class": exc.__class__.__name__},
            )
        ).model_dump()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=content
        )
