import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agents.lyrics_learning_provider_factory import (
    resolve_lyrics_learning_agent_provider,
)
from app.api.routes.lyrics_learning import router as lyrics_learning_router
from app.api.routes.settings import router as settings_router
from app.config import Settings

logger = logging.getLogger("uvicorn.error")


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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings.from_env()
    resolution = resolve_lyrics_learning_agent_provider(settings)
    app.state.lyrics_learning_agent_provider = resolution.provider
    logger.info(
        "Agent provider resolved: environment=%s configured_provider=%s "
        "resolved_provider=%s profile=%s model=%s",
        resolution.app_env,
        resolution.configured_provider,
        resolution.resolved_provider,
        resolution.profile,
        resolution.model,
    )
    yield


app = FastAPI(
    title="AoTune API",
    description="API foundation for the AoTune personal-first agent workspace.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(lyrics_learning_router)
app.include_router(settings_router)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="aotune-api")


@app.get(
    "/api/workspaces/templates",
    response_model=list[WorkspaceTemplate],
)
async def list_workspace_templates() -> list[WorkspaceTemplate]:
    return WORKSPACE_TEMPLATES
