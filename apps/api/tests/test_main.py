import asyncio

import httpx

from app.main import app


async def get(path: str) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.get(path)


def test_health() -> None:
    response = asyncio.run(get("/health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "aotune-api"}


def test_workspace_templates() -> None:
    response = asyncio.run(get("/api/workspaces/templates"))
    templates = response.json()

    assert response.status_code == 200
    assert len(templates) == 5
    assert [item["id"] for item in templates] == [
        "japanese-lyrics-learning",
        "japanese-music-research",
        "cosplay-planning",
        "creative-studio",
        "personal-branding-studio",
    ]
    assert templates[0]["status"] == "phase-1"
    assert all(item["status"] == "placeholder" for item in templates[1:])
