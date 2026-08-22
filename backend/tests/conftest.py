import os
import sys
from typing import Generator
import pytest
from fastapi.testclient import TestClient

# Set ENVIRONMENT to testing to override settings defaults
os.environ["ENVIRONMENT"] = "testing"
os.environ["LOG_LEVEL"] = "WARNING"

# Add app parent directory to sys.path to enable smooth imports in all execution contexts
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
