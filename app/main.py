import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import analytics, chat, modeling

app = FastAPI(title="DatosParaTodos — CRISP-DM Data Science Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


# Serve frontend static files (Presentation/) at root.
# Registered last so API routes always take priority.
_frontend = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Presentation")
if os.path.isdir(_frontend):
    app.mount("/", StaticFiles(directory=_frontend, html=True), name="frontend")