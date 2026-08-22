from google.cloud import storage  # type: ignore[attr-defined]
from loguru import logger

from app.core.config import settings

# Global Cloud Storage Client
_storage_client: storage.Client | None = None


def initialize_storage() -> storage.Client | None:
    """
    Initializes the Google Cloud Storage client.
    Handles missing credentials gracefully in dev environment.
    """
    global _storage_client
    if _storage_client is not None:
        return _storage_client

    try:
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            logger.info(
                f"Initializing Google Cloud Storage using service account: {settings.GOOGLE_APPLICATION_CREDENTIALS}"
            )
            _storage_client = storage.Client.from_service_account_json(
                settings.GOOGLE_APPLICATION_CREDENTIALS
            )
        else:
            if settings.ENVIRONMENT in ["production", "staging"]:
                logger.info(
                    "Initializing Google Cloud Storage using Application Default Credentials (ADC)"
                )
                _storage_client = storage.Client()
            else:
                logger.warning(
                    "Google Application Credentials not provided. Running in development mode without active Google Cloud Storage."
                )
                return None

        # Verify bucket access if configured
        if settings.GCS_BUCKET:
            _storage_client.bucket(settings.GCS_BUCKET)
            logger.info(f"Connected to GCS Bucket: {settings.GCS_BUCKET}")
        else:
            logger.warning("GCS_BUCKET name is not configured in settings.")

        logger.info("Google Cloud Storage client initialized successfully.")
        return _storage_client

    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initialize Google Cloud Storage Client.")
        if settings.ENVIRONMENT in ["production", "staging"]:
            raise RuntimeError(
                f"Storage initialization failed in {settings.ENVIRONMENT} environment: {e}"
            )
        else:
            logger.warning(
                "Continuing execution in development/testing mode without Google Cloud Storage."
            )
            return None


def get_storage_client() -> storage.Client:
    """
    Dependency injection helper to retrieve GCS Client.
    """
    if _storage_client is None:
        client = initialize_storage()
        if client is None:
            raise RuntimeError(
                "GCS Client is not initialized. Please verify credentials."
            )
        return client
    return _storage_client
