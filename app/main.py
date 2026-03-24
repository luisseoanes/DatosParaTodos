from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import chat

app = FastAPI(title="Gemini Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "Presentation"


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Accept",
    }


@app.options("/api/proxy")
async def proxy_options():
    return Response(status_code=204, headers=cors_headers())


@app.get("/api/proxy")
async def proxy(url: str):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Missing or invalid url")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            upstream = await client.get(url, headers={"User-Agent": "DPT-local-proxy"})
        return Response(
            content=upstream.content,
            status_code=upstream.status_code,
            headers={**cors_headers(), "Content-Type": upstream.headers.get("content-type", "application/octet-stream")},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxy error: {exc}") from exc


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve static front-end (Presentation) at root
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
