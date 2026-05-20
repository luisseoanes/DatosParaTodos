from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class ModelingRequest(BaseModel):
    """Solicitud para ejecutar el pipeline completo de modelado."""
    data: list[dict[str, Any]] = Field(default_factory=list)
    target_col: Optional[str] = None  # Si es None, auto-detecta


class PhaseResult(BaseModel):
    name: str
    status: str
    detail: str


class ModelResult(BaseModel):
    name: str
    type: str  # "supervisado" o "ensamble"
    error: Optional[str] = None
    cv_accuracy_mean: float = 0
    cv_accuracy_std: float = 0
    cv_scores: list[float] = Field(default_factory=list)
    cv_precision_mean: float = 0
    cv_recall_mean: float = 0
    cv_f1_mean: float = 0
    test_accuracy: float = 0
    test_precision: float = 0
    test_recall: float = 0
    test_f1: float = 0
    test_auc_roc: Optional[float] = None
    confusion_matrix: list[list[int]] = Field(default_factory=list)


class AnovaResult(BaseModel):
    f_statistic: Optional[float] = None
    p_value: Optional[float] = None
    significant: bool = False


class TukeyComparison(BaseModel):
    group1: str
    group2: str
    mean_diff: float
    p_value: float
    significant: bool


class AnovaTukeyResult(BaseModel):
    anova: AnovaResult = Field(default_factory=AnovaResult)
    tukey_comparisons: list[TukeyComparison] = Field(default_factory=list)


class GridSearchResult(BaseModel):
    model_name: str
    best_params: dict[str, str] = Field(default_factory=dict)
    best_cv_score: float = 0
    test_accuracy_after: float = 0
    improvement: float = 0
    error: Optional[str] = None


class BestModelInfo(BaseModel):
    name: str
    final_test_accuracy: float = 0
    pipeline_size_kb: float = 0
    pipeline_b64: str = ""
    pipeline_steps: list[str] = Field(default_factory=list)
    error: Optional[str] = None


class PipelineStep(BaseModel):
    name: str
    desc: str


class PipelineInfo(BaseModel):
    steps: list[PipelineStep] = Field(default_factory=list)
    ready_for_deployment: bool = False
    num_cols: list[str] = Field(default_factory=list)
    cat_cols: list[str] = Field(default_factory=list)
    target_col: Optional[str] = None


class TargetInfo(BaseModel):
    target: Optional[str] = None
    type: str = "unknown"
    classes: list[str] = Field(default_factory=list)
    n_classes: int = 0


class DataSummary(BaseModel):
    n_samples: int = 0
    n_features: int = 0
    feature_names: list[str] = Field(default_factory=list)
    numeric_cols: list[str] = Field(default_factory=list)
    cat_cols: list[str] = Field(default_factory=list)
    classes: list[str] = Field(default_factory=list)


class SplitInfo(BaseModel):
    train_size: int = 0
    test_size: int = 0
    train_pct: float = 0
    test_pct: float = 0


class BalanceInfo(BaseModel):
    needed: bool = False
    applied: bool = False
    method: str = ""
    class_distribution_before: dict[str, int] = Field(default_factory=dict)
    class_distribution_after: dict[str, int] = Field(default_factory=dict)


class ModelingResponse(BaseModel):
    """Respuesta con todos los resultados del pipeline de modelado."""
    error: Optional[str] = None
    target_info: Optional[TargetInfo] = None
    data_summary: Optional[DataSummary] = None
    split_info: Optional[SplitInfo] = None
    balance_info: Optional[BalanceInfo] = None
    phases: list[PhaseResult] = Field(default_factory=list)
    models_results: list[ModelResult] = Field(default_factory=list)
    anova_tukey: Optional[AnovaTukeyResult] = None
    top3_models: list[str] = Field(default_factory=list)
    gridsearch_results: list[GridSearchResult] = Field(default_factory=list)
    bayesian_results: list[GridSearchResult] = Field(default_factory=list)
    best_model: Optional[BestModelInfo] = None
    pipeline_info: Optional[PipelineInfo] = None


class DetectTargetRequest(BaseModel):
    data: list[dict[str, Any]] = Field(default_factory=list)


class DetectTargetResponse(BaseModel):
    target: Optional[str] = None
    type: str = "unknown"
    classes: list[str] = Field(default_factory=list)
    n_classes: int = 0
    candidates: list[dict[str, Any]] = Field(default_factory=list)


class PredictionRequest(BaseModel):
    input_data: dict[str, Any]


class PredictionResponse(BaseModel):
    prediction: str
    probabilities: dict[str, float] = Field(default_factory=dict)
    error: Optional[str] = None
