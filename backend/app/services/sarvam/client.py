import httpx
from loguru import logger
from typing import Any, Dict, Optional
from app.services.sarvam.config import SarvamConfig

class SarvamClient:
    """Base client for interacting with Sarvam AI REST APIs."""
    
    @classmethod
    def _get_headers(cls) -> Dict[str, str]:
        return {
            "api-subscription-key": SarvamConfig.get_api_key() or "",
            "Content-Type": "application/json"
        }

    @classmethod
    async def post(cls, endpoint: str, json_payload: Dict[str, Any] = None, data: Any = None, files: Any = None) -> Dict[str, Any]:
        """Executes a POST request and handles graceful degradation on failure."""
        if not SarvamConfig.is_enabled():
            return {"status": "error", "message": "Sarvam integration is disabled or unconfigured."}

        url = f"{SarvamConfig.get_base_url().rstrip('/')}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=SarvamConfig.get_timeout()) as client:
                kwargs = {"headers": cls._get_headers()}
                if json_payload is not None:
                    kwargs["json"] = json_payload
                if data is not None:
                    kwargs["data"] = data
                if files is not None:
                    kwargs["files"] = files
                
                # Some endpoints (like file uploads) shouldn't force Content-Type to application/json
                if files is not None and "Content-Type" in kwargs["headers"]:
                    del kwargs["headers"]["Content-Type"]

                response = await client.post(url, **kwargs)
                
                if response.status_code == 402:
                    SarvamConfig.disable(reason="API credits exhausted (402 Payment Required).")
                    return {"status": "error", "message": "Sarvam API credits exhausted."}
                
                if response.status_code == 401 or response.status_code == 403:
                    SarvamConfig.disable(reason=f"Authentication failed ({response.status_code}). Check API key.")
                    return {"status": "error", "message": "Sarvam API authentication failed."}
                    
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Sarvam HTTP Error: {e.response.status_code} - {e.response.text}")
            return {"status": "error", "message": f"Sarvam HTTP error: {e.response.status_code}"}
        except httpx.RequestError as e:
            logger.error(f"Sarvam Request Error: {e}")
            return {"status": "error", "message": f"Sarvam network error: {e}"}
        except Exception as e:
            logger.exception(f"Unexpected Sarvam Client Error: {e}")
            return {"status": "error", "message": str(e)}

    @classmethod
    async def get(cls, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Executes a GET request."""
        if not SarvamConfig.is_enabled():
            return {"status": "error", "message": "Sarvam integration is disabled or unconfigured."}

        url = f"{SarvamConfig.get_base_url().rstrip('/')}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=SarvamConfig.get_timeout()) as client:
                response = await client.get(url, headers=cls._get_headers(), params=params)
                
                if response.status_code == 402:
                    SarvamConfig.disable(reason="API credits exhausted (402 Payment Required).")
                    return {"status": "error", "message": "Sarvam API credits exhausted."}
                
                if response.status_code == 401 or response.status_code == 403:
                    SarvamConfig.disable(reason=f"Authentication failed ({response.status_code}). Check API key.")
                    return {"status": "error", "message": "Sarvam API authentication failed."}
                    
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Sarvam HTTP Error: {e.response.status_code} - {e.response.text}")
            return {"status": "error", "message": f"Sarvam HTTP error: {e.response.status_code}"}
        except httpx.RequestError as e:
            logger.error(f"Sarvam Request Error: {e}")
            return {"status": "error", "message": f"Sarvam network error: {e}"}
        except Exception as e:
            logger.exception(f"Unexpected Sarvam Client Error: {e}")
            return {"status": "error", "message": str(e)}
