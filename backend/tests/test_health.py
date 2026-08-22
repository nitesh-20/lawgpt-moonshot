# pyrefly: ignore [missing-import]
from fastapi import status
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient

def test_root_endpoint(client: TestClient):
    response = client.get("/api/v1/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "name" in data
    assert "version" in data

def test_health_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"

def test_ready_endpoint(client: TestClient):
    response = client.get("/api/v1/ready")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ready"
    assert "firestore" in data["services"]

def test_live_endpoint(client: TestClient):
    response = client.get("/api/v1/live")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "live"

def test_version_endpoint(client: TestClient):
    response = client.get("/api/v1/version")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "version" in data

def test_agents_endpoint(client: TestClient):
    response = client.get("/api/v1/agents")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "agents" in data
    assert len(data["agents"]) == 8


