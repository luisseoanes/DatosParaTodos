import uuid
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.chat import StartSessionRequest, MessageRequest, ChatResponse, DeleteResponse
from app.services.session import session_manager
from app.services.gemini import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/session", response_model=ChatResponse)
async def start_session(req: StartSessionRequest):
    """
    Crea una sesión nueva y obtiene la presentación del agente.

    Para el agente de navegación (index):
        { "agent_type": "navigation" }

    Para el agente especialista (sección):
        {
          "agent_type": "specialist",
          "categoria": "movilidad",
          "conclusiones": "...output del pipeline..."
        }
    """
    session_id = str(uuid.uuid4())

    session_manager.create(
        session_id=session_id,
        agent_type=req.agent_type,
        system_context=req.context or "",
        categoria=req.categoria or "",
        conclusiones=req.conclusiones or "",
    )

    session_data = session_manager.get(session_id)

    try:
        reply = await gemini_service.send(session_data, user_message=None)
    except Exception as e:
        logger.error(f"Gemini error on session start: {e}")
        reply = (
            "⚠️ No pude conectarme con Gemini en este momento. "
            "Esto puede deberse a un límite de cuota temporal o a un problema con la API key. "
            "Intenta de nuevo en unos segundos."
        )

    return ChatResponse(session_id=session_id, reply=reply)


@router.post("/message", response_model=ChatResponse)
async def send_message(req: MessageRequest):
    """Envía un mensaje dentro de una sesión existente."""
    if not session_manager.exists(req.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada.")

    session_data = session_manager.get(req.session_id)

    try:
        reply = await gemini_service.send(session_data, user_message=req.message)
        session_manager.append(req.session_id, user_msg=req.message, assistant_msg=reply)
    except Exception as e:
        logger.error(f"Gemini error on message: {e}")
        reply = (
            "⚠️ Error al procesar tu mensaje con Gemini. "
            "Puede ser un límite de cuota temporal. Intenta de nuevo en unos segundos."
        )

    return ChatResponse(session_id=req.session_id, reply=reply)


@router.delete("/session/{session_id}", response_model=DeleteResponse)
async def end_session(session_id: str):
    """Elimina la sesión."""
    session_manager.delete(session_id)
    return DeleteResponse(detail="Sesión eliminada.")