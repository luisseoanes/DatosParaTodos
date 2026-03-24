from typing import Literal, Optional
from pydantic import BaseModel


class StartSessionRequest(BaseModel):
    agent_type: Literal["navigation", "specialist"] = "navigation"
    # Solo para specialist:
    categoria: Optional[str] = None
    conclusiones: Optional[str] = None
    # Legacy, mantenido por compatibilidad:
    context: Optional[str] = None


class MessageRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str


class DeleteResponse(BaseModel):
    detail: str