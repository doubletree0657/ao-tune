from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "aotune-api"}


def test_workspace_templates() -> None:
    response = client.get("/api/workspaces/templates")
    templates = response.json()

    assert response.status_code == 200
    assert len(templates) == 5
    assert templates[0]["id"] == "japanese-lyrics-learning"
    assert templates[0]["status"] == "phase-1"
    assert all(item["status"] == "placeholder" for item in templates[1:])
