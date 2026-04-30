"""
utils/config.py
---------------
Centralized configuration management using Pydantic Settings.
All environment variables are validated and typed here.
"""

from functools import lru_cache
from typing import Literal, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────────
    app_name: str = "Enterprise AI Knowledge Assistant"
    app_version: str = "1.0.0"
    app_env: Literal["development", "staging", "production", "testing"] = "production"
    debug: bool = False
    secret_key: str = Field(default="change-me-in-production", min_length=16)

    # ── Server ───────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1024, le=65535)
    workers: int = Field(default=4, ge=1)
    reload: bool = False

    # ── Database ─────────────────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "enterprise_ai"
    postgres_user: str = "enterprise_user"
    postgres_password: str = "enterprise_pass"
    database_url: str = "postgresql+asyncpg://enterprise_user:enterprise_pass@localhost:5432/enterprise_ai"

    # ── Redis ────────────────────────────────────────────────────
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = Field(default=3600, ge=60)

    # ── Vector Store ─────────────────────────────────────────────
    vector_store_type: Literal["chroma", "faiss"] = "chroma"
    chroma_persist_dir: str = "./data/chroma"
    faiss_index_dir: str = "./data/faiss"
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    top_k_retrieval: int = Field(default=5, ge=1, le=20)

    # ── LLM ──────────────────────────────────────────────────────
    llm_provider: Literal["anthropic", "openai", "gemini", "groq"] = "groq"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    llm_model: str = "claude-sonnet-4-20250514"
    llm_max_tokens: int = Field(default=4096, ge=256)
    llm_temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    llm_timeout_seconds: int = Field(default=60, ge=10)

    # ── Chunking ─────────────────────────────────────────────────
    chunk_size: int = Field(default=512, ge=64)
    chunk_overlap: int = Field(default=64, ge=0)
    min_chunk_size: int = Field(default=100, ge=10)

    # ── Observability ────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_format: Literal["json", "text"] = "json"
    metrics_enabled: bool = True
    metrics_port: int = 9090

    # ── File Upload ──────────────────────────────────────────────
    max_file_size_mb: int = Field(default=50, ge=1, le=500)
    allowed_extensions: str = "pdf,txt,json,csv,log"
    upload_dir: str = "./data/uploads"

    # ── Agent System ─────────────────────────────────────────────
    agent_max_iterations: int = Field(default=10, ge=1, le=50)
    agent_timeout_seconds: int = Field(default=120, ge=30)
    memory_window_size: int = Field(default=10, ge=1, le=50)

    # ── Security ─────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"
    api_key_header: str = "X-API-Key"
    rate_limit_per_minute: int = Field(default=60, ge=1)

    @field_validator("allowed_extensions", mode="before")
    @classmethod
    def parse_extensions(cls, v: str) -> str:
        return v.strip()

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.allowed_extensions.split(",")]

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def active_llm_api_key(self) -> str:
        keys = {
            "anthropic": self.anthropic_api_key,
            "openai": self.openai_api_key,
            "gemini": self.gemini_api_key,
            "groq": self.groq_api_key,
        }
        return keys.get(self.llm_provider, "")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings singleton — call this everywhere."""
    return Settings()


# Module-level singleton for convenience imports
settings = get_settings()
