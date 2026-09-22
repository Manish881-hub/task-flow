"""Centralized typed config. Fail fast if required vars are missing."""
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

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
