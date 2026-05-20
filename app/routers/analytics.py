from fastapi import APIRouter

from app.schemas.analytics import (
    DataCleaningRequest,
    DataCleaningResponse,
    DataProfileRequest,
    DataProfileResponse,
    PredictionRequest,
    PredictionResponse,
)
from app.services.analytics import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/profile", response_model=DataProfileResponse)
async def profile_dataset(req: DataProfileRequest):
    """Perfila el dataset y devuelve columnas detectadas con estadisticas basicas."""
    result = analytics_service.analyze_data(req.data)
    return DataProfileResponse(**result)


@router.post("/clean", response_model=DataCleaningResponse)
async def clean_dataset(req: DataCleaningRequest):
    """Ejecuta limpieza de datos: duplicados, nulos, outliers y normalizacion."""
    result = analytics_service.run_cleaning_pipeline(req.data)
    return DataCleaningResponse(**result)


@router.post("/predict", response_model=PredictionResponse)
async def predict_series(req: PredictionRequest):
    """Calcula una prediccion simple de serie temporal usando regresion lineal."""
    result = analytics_service.simple_prediction(req.values, req.steps)
    return PredictionResponse(**result)
