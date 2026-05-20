from fastapi import APIRouter, HTTPException

from app.schemas.modeling import (
    ModelingRequest,
    ModelingResponse,
    DetectTargetRequest,
    DetectTargetResponse,
    PredictionRequest,
    PredictionResponse,
)
from app.services.modeling import modeling_service

router = APIRouter(prefix="/analytics", tags=["modeling"])


@router.post("/detect-target", response_model=DetectTargetResponse)
async def detect_target(req: DetectTargetRequest):
    """Detecta automáticamente la variable objetivo para clasificación."""
    result = modeling_service.detect_target(req.data)

    # También devolver candidatos (columnas categóricas con 2-20 clases)
    candidates = []
    if req.data:
        cols = list(req.data[0].keys())
        for col in cols:
            vals = [r.get(col) for r in req.data if r.get(col) not in (None, "")]
            if not vals:
                continue
            # Check if numeric
            from app.services.modeling import _safe_float
            nums = [_safe_float(v) for v in vals[:50]]
            num_ratio = sum(1 for n in nums if n is not None) / len(nums) if nums else 0
            if num_ratio > 0.7:
                continue
            unique = sorted(set(str(v) for v in vals))
            n_unique = len(unique)
            if 2 <= n_unique <= 20:
                candidates.append({
                    "col": col,
                    "n_classes": n_unique,
                    "classes": unique[:10],
                    "sample_size": len(vals),
                })

    return DetectTargetResponse(
        target=result.get("target"),
        type=result.get("type", "unknown"),
        classes=result.get("classes", []),
        n_classes=result.get("n_classes", 0),
        candidates=candidates,
    )


@router.post("/model", response_model=ModelingResponse)
async def run_modeling(req: ModelingRequest):
    """Ejecuta el pipeline completo de modelado CRISP-DM."""
    result = modeling_service.run_full_pipeline(req.data, req.target_col)
    return ModelingResponse(**result)


@router.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    """Realiza una predicción usando el modelo entrenado en la sesión."""
    result = modeling_service.predict(req.input_data)
    if "error" in result:
        return PredictionResponse(prediction="Error", error=result["error"])
    return PredictionResponse(**result)

from fastapi.responses import Response
import pickle

@router.get("/download_model")
async def download_model():
    """Descarga el modelo entrenado (Pipeline) en formato .pickle."""
    if "last" not in modeling_service.model_cache:
        raise HTTPException(status_code=404, detail="No hay ningún modelo entrenado en caché. Ejecuta el modelado primero.")
    
    pipeline = modeling_service.model_cache["last"]["pipeline"]
    buffer = pickle.dumps(pipeline)
    
    return Response(
        content=buffer,
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=mejor_modelo_crispdm.pickle"}
    )
