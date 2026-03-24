from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3-flash-preview"
    ALLOWED_ORIGINS: list[str] = [
        "*"
    ]
    SESSION_TTL_MINUTES: int = 120

    class Config:
        env_file = ".env"


settings = Settings()