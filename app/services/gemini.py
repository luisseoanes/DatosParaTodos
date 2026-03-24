from typing import Optional
import google.generativeai as genai

from app.config import settings


class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model_name = settings.GEMINI_MODEL

    async def send(self, session_data: dict, user_message: Optional[str] = None) -> str:
        """
        Envía un mensaje a Gemini usando el historial de la sesión.
        Si user_message es None, inicializa la sesión con el contexto.
        """
        system_context = session_data.get("system_context", "")
        history = session_data.get("history", [])

        model = genai.GenerativeModel(
            model_name=self._model_name,
            system_instruction=system_context or None,
        )

        gemini_history = [
            {"role": turn["role"], "parts": [turn["content"]]}
            for turn in history
        ]

        chat = model.start_chat(history=gemini_history)

        prompt = user_message or "Confirma que entendiste el contexto y preséntate brevemente."
        response = chat.send_message(prompt)

        return response.text


# Singleton
gemini_service = GeminiService()