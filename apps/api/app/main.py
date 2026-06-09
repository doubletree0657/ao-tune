from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["aotune-api"]


class WorkspaceTemplate(BaseModel):
    id: str
    name: str
    description: str
    status: Literal["phase-1", "placeholder"]


WORKSPACE_TEMPLATES = [
    WorkspaceTemplate(
        id="japanese-lyrics-learning",
        name="Japanese Lyrics Learning",
        description=(
            "Prepare pronunciation, meaning notes, and sing-along practice from lyrics."
        ),
        status="phase-1",
    ),
    WorkspaceTemplate(
        id="japanese-music-research",
        name="Japanese Music Research",
        description=(
            "Collect structured notes about artists, songs, themes, and context."
        ),
        status="placeholder",
    ),
    WorkspaceTemplate(
        id="cosplay-planning",
        name="Cosplay Planning",
        description="Organize character research, references, materials, and plans.",
        status="placeholder",
    ),
    WorkspaceTemplate(
        id="creative-studio",
        name="Creative Studio",
        description=(
            "Develop prompts, visual concepts, stories, and creative directions."
        ),
        status="placeholder",
    ),
    WorkspaceTemplate(
        id="personal-branding-studio",
        name="Personal Branding Studio",
        description="Shape identity-driven materials with intention and consistency.",
        status="placeholder",
    ),
]


app = FastAPI(
    title="AoTune API",
    description="API foundation for the AoTune personal-first agent workspace.",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="aotune-api")


@app.get(
    "/api/workspaces/templates",
    response_model=list[WorkspaceTemplate],
)
async def list_workspace_templates() -> list[WorkspaceTemplate]:
    return WORKSPACE_TEMPLATES
