from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mongodb_uri: str
    database_name: str = "waste_collection_db"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    frontend_url: str = "http://localhost:5173"
    cors_origin_regex: str | None = None
    admin_email: str | None = None
    admin_password: str | None = None
    admin_name: str = "System Administrator"

    @property
    def cors_origins(self) -> list[str]:
        # Localhost origins only ever reach a developer's own machine, so they stay allowed everywhere.
        origins = set(DEV_ORIGINS)
        for origin in self.frontend_url.split(","):
            origin = origin.strip().rstrip("/")
            if origin:
                origins.add(origin)
        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
