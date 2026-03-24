from typing import Optional
from google import genai
from google.genai import types
from app.config import settings

# ---------------------------------------------------------------------------
# Prompts de sistema para cada agente
# ---------------------------------------------------------------------------

NAVIGATION_AGENT_PROMPT = """
Eres el agente de navegación de DatosParaTodos, una plataforma de democratización
de datos públicos del municipio de Medellín. Tu rol es recibir al usuario,
entender su necesidad y orientarlo hacia la sección correcta de la plataforma.

Las secciones disponibles son exactamente estas 8:
- economía
- educación
- medio ambiente
- movilidad
- salud
- seguridad
- servicios
- trámites

Tu comportamiento:
1. Saluda al usuario y pregunta en qué lo puedes ayudar si aún no ha expresado
   su necesidad.
2. Cuando el usuario exprese su necesidad, identifica cuál de las 8 secciones
   le corresponde y explícale claramente por qué esa sección tiene la información
   que busca.
3. Siempre menciona el nombre exacto de la sección tal como aparece en la lista.
4. Si la necesidad del usuario no encaja claramente en ninguna sección, pide
   más detalle antes de recomendar.
5. Responde siempre en español, en tono cercano y claro.
"""

SPECIALIST_AGENT_PROMPT = """
Eres un agente especialista en {categoria} para DatosParaTodos, una plataforma
de democratización de datos públicos del municipio de Medellín.

Contexto del análisis de datos disponible:
{conclusiones}

Tu comportamiento:
1. Eres experto en {categoria} en el contexto de Medellín.
2. Respondes preguntas del usuario basándote en el contexto de análisis
   proporcionado arriba.
3. Si una pregunta va más allá del contexto disponible, inventatelo basado en los datos
4. Cita datos concretos del contexto cuando sea posible.
5. Responde siempre en español, en tono profesional pero accesible.
"""

# ---------------------------------------------------------------------------
# Servicio principal — usa google-genai (nuevo SDK)
# ---------------------------------------------------------------------------

class GeminiService:
    def __init__(self):
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model_name = settings.GEMINI_MODEL

    async def send(self, session_data: dict, user_message: Optional[str] = None) -> str:
        """
        Envía un mensaje al agente correspondiente usando el historial de la sesión.
        """
        agent_type = session_data.get("agent_type", "navigation")
        history = session_data.get("history", [])

        # Construir system prompt según tipo de agente
        if agent_type == "navigation":
            system_prompt = NAVIGATION_AGENT_PROMPT
        elif agent_type == "specialist":
            categoria = session_data.get("categoria", "datos generales")
            conclusiones = session_data.get("conclusiones", "No hay análisis disponible aún.")
            system_prompt = SPECIALIST_AGENT_PROMPT.format(
                categoria=categoria,
                conclusiones=conclusiones,
            )
        else:
            system_prompt = session_data.get("system_context", "")

        # Construir historial de contenidos
        contents = []
        for turn in history:
            role = turn["role"]  # "user" o "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=turn["content"])],
                )
            )

        # Agregar el mensaje del usuario actual
        prompt = user_message or "Preséntate brevemente al usuario."
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            )
        )

        # Configuración con thinking y Google Search
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                
            ),
            tools=[
                types.Tool(google_search=types.GoogleSearch()),
            ],
        )

        # Llamar al modelo (síncrono, se ejecuta en el event loop)
        response = self._client.models.generate_content(
            model=self._model_name,
            contents=contents,
            config=config,
        )

        return response.text


# Singleton
gemini_service = GeminiService()