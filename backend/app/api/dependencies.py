from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth
import os
from loguru import logger
from typing import Optional
from app.core.config import settings

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Validates Firebase JWT token. Returns user payload if valid, otherwise returns dev user in development/testing.
    """
    if not credentials:
        if settings.ENVIRONMENT in ["testing", "development"]:
            return {"uid": "dev_user", "email": "dev@lawgpt.local", "name": "Counsel"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    try:
        # Verify the Firebase token
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        if settings.ENVIRONMENT in ["testing", "development"]:
            return {"uid": "dev_user", "email": "dev@lawgpt.local", "name": "Counsel"}
        logger.warning(f"Invalid authentication credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Validates Firebase JWT token if present, otherwise returns None.
    """
    if not credentials:
        return None
        
    token = credentials.credentials
    try:
        return auth.verify_id_token(token)
    except Exception:
        return None
