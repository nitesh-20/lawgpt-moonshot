import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware


class RequestLifecycleMiddleware(BaseHTTPMiddleware):
    """
    Middleware that manages:
    1. Generating and injecting a unique Request ID.
    2. Timing request execution and adding X-Process-Time header.
    3. Structured request and response logging.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate Request ID or retrieve from headers
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # Store on request state so endpoints can access it if needed
        request.state.request_id = request_id

        start_time = time.perf_counter()

        # Log request receipt in loguru contextualized scope (request_id will be bound)
        with logger.contextualize(request_id=request_id):
            client_host = request.client.host if request.client else "unknown"
            logger.info(
                f"Request started: {request.method} {request.url.path} | Client: {client_host}"
            )

            try:
                response: Response = await call_next(request)
            except Exception as e:
                # Log execution failures before the global exception handler catches it
                process_time = time.perf_counter() - start_time
                logger.error(
                    f"Request failed: {request.method} {request.url.path} | "
                    f"Duration: {process_time:.4f}s | Error: {e!s}"
                )
                raise

            # Request succeeded or handled by exception handlers
            process_time = time.perf_counter() - start_time

            # Inject headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"

            logger.info(
                f"Request completed: {request.method} {request.url.path} | "
                f"Status: {response.status_code} | Duration: {process_time:.4f}s"
            )

            return response
