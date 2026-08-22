from app.core.config import settings

# CORS configuration
CORS_ORIGINS: list[str] = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://localhost:8080",
    "http://localhost:8083",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8083",
]

# If in dev/testing mode, expand allowed origins for any local port
if settings.ENVIRONMENT in ["development", "testing"]:
    CORS_ORIGINS = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://localhost:8083",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8083",
    ]

CORS_ALLOW_CREDENTIALS: bool = True
CORS_ALLOW_METHODS: list[str] = ["*"]
CORS_ALLOW_HEADERS: list[str] = ["*"]

# Trusted Hosts configuration
TRUSTED_HOSTS: list[str] = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
]

if settings.ENVIRONMENT == "production":
    # In production, specify your hosts
    TRUSTED_HOSTS = ["localhost", "127.0.0.1", "backend"]
else:
    TRUSTED_HOSTS = ["*"]
