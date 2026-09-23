"""Centralized typed config. Fail fast if required vars are missing."""
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_EXPIRES_MIN: int = 15
    REFRESH_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:3000"
    ENV: str = "dev"
    RATE_LIMIT_ENABLED: bool = True

    @field_validator("JWT_SECRET")
    @classmethod
    def secret_min_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v

    @field_validator("JWT_EXPIRES_MIN")
    @classmethod
    def access_expiry_sane(cls, v: int) -> int:
        if not 1 <= v <= 60:
            raise ValueError("JWT_EXPIRES_MIN must be 1-60 minutes")
        return v

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
