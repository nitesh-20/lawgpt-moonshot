import asyncio
import os
import time
from contextlib import asynccontextmanager
from loguru import logger
from typing import Any, Dict, Optional

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from app.services.sarvam.config import SarvamConfig

class SarvamMCPManager:
    """Manager to maintain a persistent single connection session to the Sarvam MCP server."""
    _instance: Optional["SarvamMCPManager"] = None
    
    def __init__(self) -> None:
        self.session: Optional[ClientSession] = None
        self._exit_stack = None
        self._lock = asyncio.Lock()
        self._connected = False
        self._read_stream = None
        self._write_stream = None
        self._connection_attempts = 0
        self._max_retries = 3

    @classmethod
    def get_instance(cls) -> "SarvamMCPManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def connect(self) -> bool:
        """Establishes connection to the Sarvam MCP server once."""
        async with self._lock:
            if self._connected and self.session:
                return True
                
            api_key = SarvamConfig.get_api_key()
            if not api_key:
                logger.warning("Sarvam API key is not configured. Sarvam MCP client will run in fallback mode.")
                return False

            self._connection_attempts += 1
            logger.info(f"Attempting to launch and connect to Sarvam MCP Server (attempt {self._connection_attempts})...")
            
            try:
                # Configure Stdio parameters to launch the Sarvam MCP server via uvx or pip binary
                server_params = StdioServerParameters(
                    command="uvx",
                    args=["sarvam-mcp"],
                    env={**os.environ, "SARVAM_API_KEY": api_key}
                )
                
                # Setup context manager stacks manually for persistent lifecycle
                from contextlib import AsyncExitStack
                self._exit_stack = AsyncExitStack()
                
                # Connect via stdio stream subprocess
                read, write = await self._exit_stack.enter_async_context(stdio_client(server_params))
                self._read_stream = read
                self._write_stream = write
                
                # Start ClientSession
                self.session = await self._exit_stack.enter_async_context(ClientSession(read, write))
                
                # Initialize connection
                await self.session.initialize()
                
                self._connected = True
                logger.info("Successfully connected to Sarvam MCP Server via stdio client.")
                return True
                
            except Exception as e:
                logger.error(f"Failed to connect to Sarvam MCP Server: {e}")
                await self.disconnect()
                return False

    async def call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any], timeout: float = 15.0) -> Optional[Any]:
        """Calls a tool exposed by the Sarvam MCP session with timing, logging, and graceful fallbacks."""
        if not self._connected or not self.session:
            # Attempt reconnection if failed
            connected = await self.connect()
            if not connected:
                logger.warning(f"Sarvam MCP client is offline. Falling back silently for tool: {tool_name}")
                return None

        start_time = time.perf_counter()
        logger.info(f"Invoking Sarvam MCP Tool: {tool_name} with args={list(arguments.keys())}")
        
        try:
            # Execute with timeout wrapper
            result = await asyncio.wait_for(
                self.session.call_tool(tool_name, arguments=arguments),
                timeout=timeout
            )
            latency = time.perf_counter() - start_time
            logger.info(f"Sarvam MCP Tool {tool_name} completed in {latency:.3f}s")
            return result
            
        except asyncio.TimeoutError:
            logger.error(f"Sarvam MCP Tool {tool_name} execution timed out after {timeout} seconds.")
            return None
        except Exception as e:
            logger.error(f"Error executing Sarvam MCP Tool {tool_name}: {e}")
            return None

    async def disconnect(self) -> None:
        """Gracefully disconnects and terminates the subprocess."""
        if self._exit_stack:
            try:
                await self._exit_stack.aclose()
            except Exception as e:
                logger.error(f"Error closing Sarvam MCP streams: {e}")
        self.session = None
        self._exit_stack = None
        self._connected = False
        self._read_stream = None
        self._write_stream = None
        logger.info("Sarvam MCP Server connection dismantled.")
