from pathlib import Path
from fastapi.testclient import TestClient

def test_startup_directories_created(client: TestClient):
    # The application factory's lifespan setup checks/creates folders on start
    for folder in ["logs", "uploads", "generated", "temp", "data"]:
        assert Path(folder).exists()
        assert Path(folder).is_dir()

def test_request_headers_injected(client: TestClient):
    # Fire a simple request to verify middleware header injection
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    
    # Assert X-Request-ID and X-Process-Time are present in headers
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers
