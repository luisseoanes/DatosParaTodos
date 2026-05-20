from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import analytics, chat, modeling

app = FastAPI(title="DatosParaTodos — CRISP-DM Data Science Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(modeling.router)


@app.get("/health")
async def health():
    return {"status": "ok"}