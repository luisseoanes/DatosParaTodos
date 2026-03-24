import uuid
from fastapi import APIRouter, HTTPException

from app.schemas.chat import StartSessionRequest, MessageRequest, ChatResponse, DeleteResponse
from app.services.session import session_manager
from app.services.gemini import gemini_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/session", response_model=ChatResponse)
async def start_session(req: StartSessionRequest):
    """Crea una sesión nueva con el contexto inicial y obtiene la presentación del modelo."""
    session_id = str(uuid.uuid4())
    session_manager.create(session_id, system_context=req.context)

    session_data = session_manager.get(session_id)
    reply = await gemini_service.send(session_data, user_message=None)

    return ChatResponse(session_id=session_id, reply=reply)


@router.post("/message", response_model=ChatResponse)
async def send_message(req: MessageRequest):
    """Envía un mensaje dentro de una sesión existente."""
    if not session_manager.exists(req.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada.")

    session_data = session_manager.get(req.session_id)
    reply = await gemini_service.send(session_data, user_message=req.message)

    session_manager.append(req.session_id, user_msg=req.message, assistant_msg=reply)

    return ChatResponse(session_id=req.session_id, reply=reply)


@router.delete("/session/{session_id}", response_model=DeleteResponse)
async def end_session(session_id: str):
    """Elimina la sesión. Llamar desde el front en beforeunload (best-effort)."""
    session_manager.delete(session_id)
    return DeleteResponse(detail="Sesión eliminada.")