import firebase_admin  # type: ignore[import-untyped]
from firebase_admin import credentials, firestore  # type: ignore[import-untyped]
from google.cloud.firestore import Client
from loguru import logger

from app.core.config import settings

# Global Firestore DB Client
_db: Client | None = None


def initialize_firestore() -> Client | None:
    """
    Initializes the Firebase Admin SDK and returns the firestore Client.
    Gracefully handles missing credentials in non-production environments to avoid app crashes.
    """
    global _db
    if _db is not None:
        return _db

    try:
        # Check if already initialized (prevents duplicate initialization)
        if not firebase_admin._apps:
            if settings.FIREBASE_PROJECT_ID == "your-firebase-project-id":
                logger.warning("Using placeholder Firebase project ID. Disabling Firestore to prevent 403 errors.")
                return None
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                logger.info(
                    f"Initializing Firebase using service account file: {settings.GOOGLE_APPLICATION_CREDENTIALS}"
                )
                cred = credentials.Certificate(settings.GOOGLE_APPLICATION_CREDENTIALS)
                firebase_admin.initialize_app(
                    cred, {"projectId": settings.FIREBASE_PROJECT_ID}
                )
            else:
                # Fallback to Application Default Credentials (ADC) or mock in dev
                if settings.ENVIRONMENT in ["production", "staging"]:
                    logger.info(
                        "Initializing Firebase using Application Default Credentials (ADC)"
                    )
                    firebase_admin.initialize_app()
                else:
                    logger.warning(
                        "Firebase credentials not provided. Running in development mode without active Firestore connection."
                    )
                    return None

        _db = firestore.client()
        logger.info("Firebase Firestore initialized successfully.")
        return _db

    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initialize Firebase Admin SDK.")
        if settings.ENVIRONMENT in ["production", "staging"]:
            # Hard crash in production/staging if DB fails to initialize
            raise RuntimeError(
                f"Database initialization failed in {settings.ENVIRONMENT} environment: {e}"
            )
        else:
            logger.warning(
                "Continuing execution in development/testing mode without Firebase connection."
            )
            return None


def get_firestore_client() -> Client:
    """
    Dependency injection helper to retrieve the Firestore Client.
    """
    if _db is None:
        # Attempt to initialize on the fly if needed
        client = initialize_firestore()
        if client is None:
            raise RuntimeError(
                "Firestore is not initialized. Please verify credentials."
            )
        return client
    return _db
