from loguru import logger
from fastapi import Request
from app.services.sarvam.mcp.manager import SarvamMCPManager
from app.services.sarvam.mcp.service import SarvamService

class SarvamProvider:
    """FastAPI context lifetime wrapper to spin up and tear down Sarvam MCP stdio subprocess once on startup."""
    
    @classmethod
    async def startup(cls) -> None:
        logger.info("Initializing Sarvam MCP Subsystem Provider...")
        manager = SarvamMCPManager.get_instance()
        
        # Connect to stdio subprocess (reused session)
        connected = await manager.connect()
        if connected:
            logger.info("Sarvam MCP Provider successfully registered and online.")
            # Trigger registry discovery
            service = SarvamService.get_instance()
            await service._ensure_registry()
        else:
            logger.warning("Sarvam MCP Provider was unable to connect to server. Running in fallback mode.")

    @classmethod
    async def shutdown(cls) -> None:
        logger.info("Dismantling Sarvam MCP Subsystem Provider...")
        manager = SarvamMCPManager.get_instance()
        await manager.disconnect()
        logger.info("Sarvam MCP Subsystem offline.")

def get_sarvam_service() -> SarvamService:
    """Dependency injector function to fetch the active SarvamService instance."""
    return SarvamService.get_instance()
