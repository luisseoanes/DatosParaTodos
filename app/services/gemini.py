from __future__ import annotations

import asyncio
import json
import re
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings

# ---------------------------------------------------------------------------
# Prompts
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
1. Saluda al usuario y pregunta en qué lo puedes ayudar si aún no ha expresado su necesidad.
2. Cuando el usuario exprese su necesidad, identifica cuál de las 8 secciones le corresponde
   y explícale claramente por qué esa sección tiene la información que busca.
3. Siempre menciona el nombre exacto de la sección tal como aparece en la lista.
4. Si la necesidad no encaja claramente en ninguna sección, pide más detalle.
5. Responde siempre en español, en tono cercano y claro.
"""

SPECIALIST_AGENT_PROMPT = """
Eres un agente especialista en {categoria} para DatosParaTodos, una plataforma
de democratización de datos públicos del municipio de Medellín.

Contexto del análisis de datos disponible:
{conclusiones}

Tu comportamiento:
1. Eres experto en {categoria} en el contexto de Medellín.
2. Respondes preguntas del usuario basándote en el contexto de análisis proporcionado.
3. Si una pregunta va más allá del contexto disponible, razona con los datos que tienes.
4. Cita datos concretos del contexto cuando sea posible.
5. Responde siempre en español, en tono profesional pero accesible.
"""

# ---------------------------------------------------------------------------
# Modelos en orden de preferencia (más ligero primero para BU)
# ---------------------------------------------------------------------------
_CHAT_MODELS = [
    "gemini-2.5-flash-lite-preview-06-17",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
]

_BU_MODELS = [
    "gemini-2.5-flash-lite-preview-06-17",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
]

# ---------------------------------------------------------------------------
# Helpers — determinar capacidades del modelo
# ---------------------------------------------------------------------------

def _model_supports_thinking(model: str) -> bool:
    """Solo los modelos flash completos (no lite, no 8b) soportan thinking."""
    lite_or_small = ("lite" in model or "8b" in model or "1.0" in model)
    return not lite_or_small

def _model_supports_search(model: str) -> bool:
    """Google Search grounding solo en flash completo y pro."""
    return _model_supports_thinking(model)

def _is_retryable_with_next_model(e: Exception) -> bool:
    """True si conviene degradar al siguiente modelo en lugar de propagar el error.

    Incluye cuota agotada (429), modelo inexistente (404) y, crucialmente,
    sobrecarga temporal del modelo (503 UNAVAILABLE / 'high demand' / 'overloaded'),
    que es frecuente en los modelos preview y antes propagaba como 500.
    """
    s = str(e)
    markers = (
        "429", "RESOURCE_EXHAUSTED",
        "404", "NOT_FOUND",
        "503", "UNAVAILABLE", "overloaded", "high demand",
    )
    return any(m in s for m in markers)

# ---------------------------------------------------------------------------
# Servicio
# ---------------------------------------------------------------------------

class GeminiService:
    def __init__(self):
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        # Modelo preferido desde .env; si no soporta algo, se degrada automáticamente
        self._model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite-preview-06-17"

    # ── Llamada genérica (sync → thread para no bloquear el event loop) ──────
    def _call_sync(self, model: str, contents: list, config: types.GenerateContentConfig) -> str:
        response = self._client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        return response.text

    async def _call(self, model: str, contents: list, config: types.GenerateContentConfig) -> str:
        return await asyncio.to_thread(self._call_sync, model, contents, config)

    # ── Chat de agentes ───────────────────────────────────────────────────────
    async def send(self, session_data: dict, user_message: Optional[str] = None) -> str:
        agent_type = session_data.get("agent_type", "navigation")
        history    = session_data.get("history", [])

        if agent_type == "navigation":
            system_prompt = NAVIGATION_AGENT_PROMPT
        elif agent_type == "specialist":
            system_prompt = SPECIALIST_AGENT_PROMPT.format(
                categoria=session_data.get("categoria", "datos generales"),
                conclusiones=session_data.get("conclusiones", "No hay análisis disponible aún."),
            )
        else:
            system_prompt = session_data.get("system_context", "")

        contents = [
            types.Content(role=t["role"], parts=[types.Part.from_text(text=t["content"])])
            for t in history
        ]
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message or "Preséntate brevemente al usuario.")],
        ))

        model = self._model_name

        # Construir config según capacidades del modelo
        cfg_kwargs: dict = {"system_instruction": system_prompt}
        if _model_supports_thinking(model):
            cfg_kwargs["thinking_config"] = types.ThinkingConfig()
        if _model_supports_search(model):
            cfg_kwargs["tools"] = [types.Tool(google_search=types.GoogleSearch())]

        config = types.GenerateContentConfig(**cfg_kwargs)

        # Intentar con modelo preferido; si 429, degradar
        for attempt_model in [model] + [m for m in _CHAT_MODELS if m != model]:
            try:
                # Reconstruir config para el modelo de intento
                ac_kwargs: dict = {"system_instruction": system_prompt}
                if _model_supports_thinking(attempt_model):
                    ac_kwargs["thinking_config"] = types.ThinkingConfig()
                if _model_supports_search(attempt_model):
                    ac_kwargs["tools"] = [types.Tool(google_search=types.GoogleSearch())]
                attempt_config = types.GenerateContentConfig(**ac_kwargs)
                return await self._call(attempt_model, contents, attempt_config)
            except Exception as e:
                if _is_retryable_with_next_model(e):
                    continue
                raise

        raise RuntimeError("Todos los modelos de Gemini están en cuota agotada o no disponibles.")

    # ── Business Understanding ────────────────────────────────────────────────
    async def generate_business_understanding(
        self, columns: list, sample: list, dataset_name: str
    ) -> dict:
        col_str    = ", ".join(columns[:25])
        sample_str = str(sample[:2]) if sample else "sin muestra"

        prompt = (
            f'Eres un analista de datos experto en datos públicos colombianos.\n'
            f'Dataset: "{dataset_name}"\n'
            f'Columnas: {col_str}\n'
            f'Muestra (2 filas): {sample_str}\n\n'
            f'Responde SOLO con JSON válido, sin markdown:\n'
            f'{{\n'
            f'  "pregunta": "Pregunta analítica principal (1-2 oraciones)",\n'
            f'  "objetivo": "Para qué sirven los resultados y quién se beneficia (1-2 oraciones)",\n'
            f'  "target_sugerido": "Nombre exacto de la columna objetivo para clasificación, o vacío",\n'
            f'  "kpis": ["KPI 1", "KPI 2", "KPI 3"],\n'
            f'  "contexto": "Contexto del dominio en 2 oraciones"\n'
            f'}}'
        )

        contents = [types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )]

        last_err: Exception | None = None
        for model in _BU_MODELS:
            try:
                config = types.GenerateContentConfig(temperature=0.2)
                text = await self._call(model, contents, config)
                text = text.strip()
                text = re.sub(r'^```(?:json)?\s*', '', text)
                text = re.sub(r'\s*```$', '', text)
                return json.loads(text)
            except Exception as e:
                last_err = e
                if _is_retryable_with_next_model(e):
                    continue  # probar siguiente modelo
                raise  # error distinto → propagar

        raise last_err  # todos los modelos agotados


# Singleton
gemini_service = GeminiService()
