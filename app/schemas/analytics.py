from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ColumnGroups(BaseModel):
    numeric: list[str]
    date: list[str]
    categorical: list[str]
    all: list[str]


class ColumnStats(BaseModel):
    type: str
    total: int
    nullCount: int
    nullPct: float
    uniqueCount: int
    mean: float | None = None
    median: float | None = None
    std: float | None = None
    min: float | None = None
    max: float | None = None


class DataProfileResponse(BaseModel):
    cols: ColumnGroups
    stats: dict[str, ColumnStats]
    rowCount: int


class DataProfileRequest(BaseModel):
    data: list[dict[str, Any]] = Field(default_factory=list)


class CleaningIssue(BaseModel):
    tipo: str
    campo: str
    original: Any
    accion: str


class DataCleaningRequest(BaseModel):
    data: list[dict[str, Any]] = Field(default_factory=list)


class DataCleaningResponse(BaseModel):
    cleanData: list[dict[str, Any]]
    issues: list[CleaningIssue]
    score: int
    steps: int


class PredictionConfidenceBand(BaseModel):
    low: float
    high: float


class PredictionRequest(BaseModel):
    values: list[float] = Field(default_factory=list)
    steps: int = 10


class PredictionResponse(BaseModel):
    predictions: list[float]
    confidence: list[PredictionConfidenceBand]
    slope: float | None = None
    intercept: float | None = None
    residStd: float | None = None
    direction: str | None = None
