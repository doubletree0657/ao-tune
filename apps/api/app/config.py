import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values

DEFAULT_ENV_FILE = Path(__file__).resolve().parents[1] / ".env.local"


def load_config_values(
    environ: Mapping[str, str],
    env_file: str | Path,
) -> dict[str, str]:
    file_values = {
        key: value
        for key, value in dotenv_values(env_file).items()
        if value is not None
    }
    return {**file_values, **environ}


@dataclass(frozen=True)
class Settings:
    agent_provider: str = "fake"
    default_llm_profile: str = "default"
    llm_provider: str = "openai-compatible"
    llm_base_url: str | None = None
    llm_model: str | None = None
    llm_api_key: str | None = None
    llm_timeout_seconds: int = 60

    @classmethod
    def from_env(
        cls,
        environ: Mapping[str, str] | None = None,
        env_file: str | Path = DEFAULT_ENV_FILE,
    ) -> "Settings":
        process_values = os.environ if environ is None else environ
        values = load_config_values(process_values, env_file)
        timeout = int(values.get("AOTUNE_LLM_TIMEOUT_SECONDS", "60"))
        if timeout <= 0:
            raise ValueError("AOTUNE_LLM_TIMEOUT_SECONDS must be greater than zero")

        return cls(
            agent_provider=values.get("AOTUNE_AGENT_PROVIDER", "fake"),
            default_llm_profile=values.get(
                "AOTUNE_DEFAULT_LLM_PROFILE",
                "default",
            ),
            llm_provider=values.get(
                "AOTUNE_LLM_PROVIDER",
                "openai-compatible",
            ),
            llm_base_url=values.get("AOTUNE_LLM_BASE_URL") or None,
            llm_model=values.get("AOTUNE_LLM_MODEL") or None,
            llm_api_key=values.get("AOTUNE_LLM_API_KEY") or None,
            llm_timeout_seconds=timeout,
        )
