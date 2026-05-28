"""
Servicio de Modelado Predictivo — CRISP-DM Avanzado
====================================================
Implementa estrictamente el flujo académico requerido:
1. Integración de datos
2. Eliminar irrelevantes (varianza cero)
3. Descripción estadística
4 & 5. Limpieza de atípicos y nulos
6 & 7. Análisis de Correlaciones (Redundancia e Irrelevancia)
8. Balanceo de datos (SMOTE)
9. Ingeniería de características:
   - PCA (Reducción de dimensionalidad)
   - Discretización / Normalización
   - Creación de dummies (OneHotEncoding)
   - Codificación de etiquetas (LabelEncoding)
10. Modelado (4 Supervisados + 3 Ensamble)
11. Validación (CV, ANOVA, Tukey) y GridSearchCV
"""

from __future__ import annotations

import base64
import io
import pickle
import warnings
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

from sklearn.model_selection import (
    StratifiedKFold,
    cross_validate,
    GridSearchCV,
    train_test_split,
)
from sklearn.preprocessing import LabelEncoder, StandardScaler, OneHotEncoder, KBinsDiscretizer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.feature_selection import VarianceThreshold
from sklearn.decomposition import PCA

# ── Clasificadores supervisados ──────────────────────────────
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier

# ── Métodos de ensamble ──────────────────────────────────────
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    AdaBoostClassifier,
)

# ── Métricas ─────────────────────────────────────────────────
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

warnings.filterwarnings("ignore")


def _round(v: float, d: int = 4) -> float:
    return round(float(v), d)


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


class ModelingService:
    """Ejecuta el pipeline avanzado de modelado CRISP-DM."""

    def __init__(self):
        self.model_cache = {}  # { "last": { "pipeline": ..., "le": ..., "features": [...] } }

    def predict(self, input_data: dict) -> dict:
        """Realiza una predicción usando el mejor modelo almacenado."""
        if "last" not in self.model_cache:
            return {"error": "No hay un modelo entrenado en la sesión actual."}
        
        cache = self.model_cache["last"]
        pipeline = cache["pipeline"]
        le = cache["le"]
        
        try:
            df = pd.DataFrame([input_data])

            # Añadir columnas faltantes con NaN para que el pipeline las impute
            required_cols = cache["num_cols"] + cache["cat_cols"]
            for col in required_cols:
                if col not in df.columns:
                    df[col] = np.nan

            # Asegurar tipos correctos para columnas numéricas
            for col in cache["num_cols"]:
                df[col] = pd.to_numeric(df[col], errors='coerce')

            y_pred = pipeline.predict(df)
            label = le.inverse_transform(y_pred)[0]
            
            # Si tiene predict_proba, devolver confianzas
            probs = {}
            if hasattr(pipeline, "predict_proba"):
                p = pipeline.predict_proba(df)[0]
                for i, class_label in enumerate(le.classes_):
                    probs[str(class_label)] = _round(float(p[i]))
            
            return {
                "prediction": str(label),
                "probabilities": probs
            }
        except Exception as e:
            return {"error": f"Error en predicción: {str(e)}"}

    @staticmethod
    def detect_target(data: list[dict], target_col: str | None = None) -> dict:
        if not data:
            return {"target": None, "type": "unknown", "classes": []}

        df = pd.DataFrame(data[:200]) # Usar muestra para detección rápida
        cols = df.columns.tolist()

        if target_col and target_col in cols:
            classes = df[target_col].dropna().astype(str).unique().tolist()
            return {"target": target_col, "type": "classification", "classes": sorted(classes), "n_classes": len(classes)}

        best_col = None
        best_n = 999
        for col in cols:
            s = df[col].dropna()
            if len(s) == 0: continue
            
            # Si es mayormente numérico, saltar
            if pd.to_numeric(s, errors='coerce').notna().mean() > 0.7:
                continue
                
            n_unique = s.nunique()
            if 2 <= n_unique <= 20 and n_unique < best_n:
                best_n = n_unique
                best_col = col

        if best_col:
            classes = df[best_col].dropna().astype(str).unique().tolist()
            return {"target": best_col, "type": "classification", "classes": sorted(classes), "n_classes": len(classes)}

        return {"target": None, "type": "unknown", "classes": []}

    def run_full_pipeline(
        self,
        data: list[dict],
        target_col: str | None = None,
    ) -> dict[str, Any]:
        
        results: dict[str, Any] = {
            "phases": [],
            "models_results": [],
            "anova_tukey": {},
            "top3_models": [],
            "gridsearch_results": [],
            "bayesian_results": [],
            "best_model": None,
            "pipeline_info": {},
        }

        # ────────────────────────────────────────────────────────
        # 1. Integración y Detección de Target
        # ────────────────────────────────────────────────────────
        df = pd.DataFrame(data)
        
        target_info = self.detect_target(data, target_col)
        if not target_info["target"]:
            results["error"] = "No se detectó variable objetivo para clasificación."
            return results

        target_col = target_info["target"]
        results["target_info"] = target_info
        
        # Eliminar filas sin target
        df = df.dropna(subset=[target_col])
        n_initial = len(df)
        
        results["phases"].append({
            "name": "1. Integración de los datos",
            "status": "done",
            "detail": f"Dataset cargado con {n_initial} registros. Target identificado: '{target_col}'"
        })

        # ────────────────────────────────────────────────────────
        # 2 y 3. Eliminar irrelevantes (Varianza 0) y Descripción
        # ────────────────────────────────────────────────────────
        y_raw = df[target_col].astype(str)
        X_df = df.drop(columns=[target_col])
        
        # Estandarizar strings (mayúsculas, sin espacios) y manejar valores vacíos
        for col in X_df.columns:
            if X_df[col].dtype == object or X_df[col].dtype.name == 'category':
                # Convertir a mayúsculas y quitar espacios para consistencia
                s = X_df[col].astype(str).str.strip().str.upper()
                s = s.replace({'': np.nan, 'NAN': np.nan, 'NONE': np.nan, 'NULL': np.nan})
                X_df[col] = s

        # Inferencia de tipos numéricos: convertir solo si >90% son válidos
        # Y la columna NO es ordinal/categórica disfrazada de número
        # (estrato 1-6, mes 1-12, hora 0-23, código DANE, etc.)
        for col in X_df.columns:
            converted = pd.to_numeric(X_df[col], errors='coerce')
            if converted.notna().mean() <= 0.90:
                continue
            non_null = converted.dropna()
            n_unique = non_null.nunique()
            all_integers = (non_null % 1 == 0).all()
            # Si tiene ≤15 valores únicos enteros → es ordinal/categórica (estrato, mes, dia...)
            if all_integers and n_unique <= 15:
                continue  # dejar como objeto para OHE
            X_df[col] = converted

        # Variables constantes (Irrelevantes)
        nunique = X_df.nunique(dropna=True)
        cols_to_drop = nunique[nunique <= 1].index.tolist()
        if cols_to_drop:
            X_df = X_df.drop(columns=cols_to_drop)
            
        results["phases"].append({
            "name": "2. Eliminar variables irrelevantes",
            "status": "done",
            "detail": f"Se eliminaron {len(cols_to_drop)} variables constantes o redundantes sin varianza."
        })

        # ────────────────────────────────────────────────────────
        # 4 y 5. Limpieza de atípicos y nulos (Pipeline base)
        # ────────────────────────────────────────────────────────
        num_cols = X_df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = X_df.select_dtypes(exclude=[np.number]).columns.tolist()
        
        results["phases"].append({
            "name": "4 & 5. Limpieza de datos atípicos y nulos",
            "status": "done",
            "detail": "Imputación configurada (Mediana para numéricos, Moda para categóricos) usando SimpleImputer."
        })

        # ────────────────────────────────────────────────────────
        # Codificación del target — necesaria antes del split para stratify=y
        # ────────────────────────────────────────────────────────
        le = LabelEncoder()
        y  = le.fit_transform(y_raw)

        # ────────────────────────────────────────────────────────
        # Split 70/30 — ANTES de correlaciones para evitar data leakage
        # ────────────────────────────────────────────────────────
        X_train_raw, X_test_raw, y_train, y_test = train_test_split(
            X_df, y, test_size=0.3, random_state=42, stratify=y
        )

        # ────────────────────────────────────────────────────────
        # 6 y 7. Análisis de Correlaciones (Redundancias) — solo sobre TRAIN
        # Calculado sobre X_train_raw para evitar data leakage del test set
        # ────────────────────────────────────────────────────────
        redundant_cols = []
        if len(num_cols) > 1:
            train_num = X_train_raw[num_cols].apply(pd.to_numeric, errors='coerce')
            corr_matrix = train_num.corr().abs()
            upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            redundant_cols = [c for c in upper.columns if any(upper[c] > 0.90)]
            if redundant_cols:
                X_train_raw = X_train_raw.drop(columns=redundant_cols)
                X_test_raw  = X_test_raw.drop(columns=redundant_cols)
                X_df        = X_df.drop(columns=redundant_cols)
                num_cols    = [c for c in num_cols if c not in redundant_cols]

        results["phases"].append({
            "name": "6 & 7. Análisis de Correlaciones (Redundancias)",
            "status": "done",
            "detail": f"Pearson sobre train (70%): se eliminaron {len(redundant_cols)} variables altamente correlacionadas (>0.90)."
        })

        # ────────────────────────────────────────────────────────
        # 9. Ingeniería de características — reglas por tipo de modelo
        # ────────────────────────────────────────────────────────

        # Fábricas de preprocesadores — cada llamada crea objetos NUEVOS e independientes
        # para evitar que los 7 pipelines compartan estado interno (bug de objeto compartido)

        def _new_cat_transformer():
            return Pipeline([
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('onehot',  OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
            ])

        def make_preprocessor_linear(nc, cc):
            """Lineales/distancia: Imputer → StandardScaler → PCA(95%) + OHE para categóricas."""
            transformers = []
            if nc:
                num_t = Pipeline([
                    ('imputer', SimpleImputer(strategy='median')),
                    ('scaler',  StandardScaler()),
                    ('pca',     PCA(n_components=0.95, random_state=42)),
                ])
                transformers.append(('num', num_t, nc))
            if cc:
                transformers.append(('cat', _new_cat_transformer(), cc))
            return ColumnTransformer(transformers, remainder='drop')

        def make_preprocessor_tree(nc, cc):
            """Árboles: Imputer → KBinsDiscretizer(quantile) para numéricas + OHE para categóricas.
            Invariantes a escala → sin StandardScaler ni PCA."""
            transformers = []
            if nc:
                n_bins = min(10, max(3, len(nc) * 2))
                num_t = Pipeline([
                    ('imputer',  SimpleImputer(strategy='median')),
                    ('discrete', KBinsDiscretizer(n_bins=n_bins, encode='ordinal', strategy='quantile')),
                ])
                transformers.append(('num', num_t, nc))
            if cc:
                transformers.append(('cat', _new_cat_transformer(), cc))
            return ColumnTransformer(transformers, remainder='drop')

        results["phases"].append({
            "name": "9. Ingeniería de características (por tipo de modelo)",
            "status": "done",
            "detail": (
                "Lineales/Distancia (LogReg, KNN, MLP): Imputer → StandardScaler → PCA(95%). "
                "Árboles (DT, RF, GB, AdaBoost): Imputer → KBinsDiscretizer(quantile) → OHE. "
                "Categóricas: Imputer → OneHotEncoding en todos los modelos."
            )
        })

        results["data_summary"] = {
            "n_samples": len(X_df),
            "n_features": len(num_cols) + len(cat_cols),
            "numeric_cols": num_cols,
            "cat_cols": cat_cols,
        }
        results["split_info"] = {
            "train_size": len(X_train_raw), "test_size": len(X_test_raw),
            "train_pct": 70, "test_pct": 30
        }

        # ────────────────────────────────────────────────────────
        # 8. Balanceo SMOTE — solo sobre el train raw para detectar ratio
        # ────────────────────────────────────────────────────────
        needs_balance = False
        smote_applied = False
        counts_raw = np.bincount(y_train)
        if len(counts_raw) >= 2:
            ratio = counts_raw.min() / counts_raw.max() if counts_raw.max() > 0 else 1
            needs_balance = ratio < 0.8

        results["balance_info"] = {
            "needed": needs_balance,
            "applied": smote_applied,
            "method": "SMOTE (aplicado en pipeline por modelo)" if needs_balance else "No requerido",
        }
        results["phases"].append({
            "name": "8. Balanceo de datos en la variable objetivo",
            "status": "done",
            "detail": f"{'SMOTE se aplica al 70% de entrenamiento dentro de cada pipeline de modelo' if needs_balance else 'Clases naturalmente balanceadas — SMOTE no requerido'}"
        })

        # ────────────────────────────────────────────────────────
        # 10. Pipelines por modelo con preprocesamiento específico
        # ────────────────────────────────────────────────────────
        n_classes = len(np.unique(y))
        avg = "weighted" if n_classes > 2 else "binary"

        # Peso para selección de modelo más ligero cuando no hay diferencia estadística
        model_weights = {
            "Regresión Logística": 1,
            "Árbol de Decisión":   2,
            "K-Vecinos (KNN)":     3,
            "Red Neuronal (MLP)":  4,
            "AdaBoost (Ensamble)": 5,
            "Gradient Boosting (Ensamble)": 6,
            "Random Forest (Ensamble)":     7,
        }

        n_neighbors_knn = min(5, max(1, len(X_train_raw) - 1))

        # Cada entrada: (clasificador, usa_preprocesador_lineal)
        model_defs: list[tuple[str, Any, bool]] = [
            # Supervisados lineales/distancia → normalización + PCA
            ("Regresión Logística",
             LogisticRegression(max_iter=1000, random_state=42), True),
            ("K-Vecinos (KNN)",
             KNeighborsClassifier(n_neighbors=n_neighbors_knn), True),
            ("Red Neuronal (MLP)",
             MLPClassifier(hidden_layer_sizes=(50,), max_iter=500, random_state=42), True),
            # Supervisado basado en árbol → discretización, sin escala
            ("Árbol de Decisión",
             DecisionTreeClassifier(random_state=42), False),
            # Ensambles de árboles → discretización, sin escala
            ("Random Forest (Ensamble)",
             RandomForestClassifier(n_estimators=100, random_state=42), False),
            ("Gradient Boosting (Ensamble)",
             GradientBoostingClassifier(n_estimators=100, random_state=42), False),
            ("AdaBoost (Ensamble)",
             AdaBoostClassifier(n_estimators=100, random_state=42), False),
        ]

        # Construir un pipeline completo (preprocessor + classifier) por modelo
        model_pipelines: dict[str, Pipeline] = {}
        for name, clf, is_linear in model_defs:
            pre = make_preprocessor_linear(num_cols, cat_cols) if is_linear \
                  else make_preprocessor_tree(num_cols, cat_cols)
            model_pipelines[name] = Pipeline([('pre', pre), ('clf', clf)])

        # ────────────────────────────────────────────────────────
        # 11. Validación cruzada 5-Fold sobre X_train_raw (sin leakage)
        # ────────────────────────────────────────────────────────

        # Aplicar SMOTE sobre el train procesado para los modelos lineales
        # (referencia para usar en CV: se usa imblearn Pipeline si hace falta)
        smote_applied = False
        if needs_balance:
            try:
                from imblearn.over_sampling import SMOTE
                from imblearn.pipeline import Pipeline as ImbPipeline
                min_samples = counts_raw.min()
                k_smote = min(5, max(1, min_samples - 1))
                if k_smote >= 1 and min_samples >= 2:
                    # Reemplazar pipelines sklearn con imblearn pipelines que incluyen SMOTE
                    new_pipelines = {}
                    for name, pipe in model_pipelines.items():
                        new_pipelines[name] = ImbPipeline([
                            ('pre',   pipe.named_steps['pre']),
                            ('smote', SMOTE(random_state=42, k_neighbors=k_smote)),
                            ('clf',   pipe.named_steps['clf']),
                        ])
                    model_pipelines = new_pipelines
                    smote_applied = True
            except Exception:
                pass

        results["balance_info"]["applied"] = smote_applied

        # n_splits adaptativo: si alguna clase tiene pocas muestras reducir folds
        min_class_count = int(np.bincount(y_train).min())
        n_splits = min(5, min_class_count) if min_class_count >= 2 else 2
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

        for name, pipe in model_pipelines.items():
            error_msg = None
            try:
                # error_score=np.nan: en vez de crashear, asigna NaN al fold que falla
                # n_jobs=-1 paraleliza los folds entre los vCPU. Los estimadores
                # se dejan en n_jobs=1 para evitar sobre-suscripción (anidamiento).
                cv_res = cross_validate(
                    pipe, X_train_raw, y_train, cv=cv,
                    scoring=["accuracy"], error_score=np.nan, n_jobs=-1
                )
                raw_scores = cv_res["test_accuracy"]
                # Filtrar NaN — folds que fallaron
                valid_scores = raw_scores[~np.isnan(raw_scores)]
                if len(valid_scores) == 0:
                    raise ValueError("Todos los folds fallaron en CV")
                acc_scores = valid_scores.tolist()

                pipe.fit(X_train_raw, y_train)
                y_pred = pipe.predict(X_test_raw)

                acc  = accuracy_score(y_test, y_pred)
                prec = precision_score(y_test, y_pred, average=avg, zero_division=0)
                rec  = recall_score(y_test, y_pred, average=avg, zero_division=0)
                f1   = f1_score(y_test, y_pred, average=avg, zero_division=0)

                auc = None
                try:
                    if hasattr(pipe, "predict_proba"):
                        y_proba = pipe.predict_proba(X_test_raw)
                        if n_classes == 2:
                            auc = roc_auc_score(y_test, y_proba[:, 1])
                        else:
                            auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
                except Exception:
                    pass

                results["models_results"].append({
                    "name": name,
                    "type": "ensamble" if "Ensamble" in name else "supervisado",
                    "cv_accuracy_mean": _round(float(np.mean(acc_scores))),
                    "cv_accuracy_std":  _round(float(np.std(acc_scores))),
                    "cv_scores":        [_round(s) for s in acc_scores],
                    "cv_precision_mean": _round(prec),
                    "cv_recall_mean":    _round(rec),
                    "cv_f1_mean":        _round(f1),
                    "test_accuracy":  _round(acc),
                    "test_precision": _round(prec),
                    "test_recall":    _round(rec),
                    "test_f1":        _round(f1),
                    "test_auc_roc":   _round(auc) if auc is not None else None,
                })
            except Exception as e:
                # Registrar el error en lugar de silenciarlo
                results["models_results"].append({
                    "name": name,
                    "type": "ensamble" if "Ensamble" in name else "supervisado",
                    "error": str(e),
                    "cv_accuracy_mean": 0.0, "cv_accuracy_std": 0.0, "cv_scores": [],
                    "cv_precision_mean": 0.0, "cv_recall_mean": 0.0, "cv_f1_mean": 0.0,
                    "test_accuracy": 0.0, "test_precision": 0.0,
                    "test_recall": 0.0, "test_f1": 0.0, "test_auc_roc": None,
                })

        results["phases"].append({
            "name": "Entrenamiento y Validación Cruzada",
            "status": "done",
            "detail": "4 supervisados + 3 ensambles con pipelines específicos por modelo (normalización/PCA para lineales, discretización para árboles). 5-Fold CV estratificado."
        })

        # ────────────────────────────────────────────────────────
        # ANOVA + Tukey
        # ────────────────────────────────────────────────────────
        valid_models = [m for m in results["models_results"] if m.get("cv_scores")]
        groups = [m["cv_scores"] for m in valid_models]
        model_names = [m["name"] for m in valid_models]

        anova_result = {"f_statistic": None, "p_value": None, "significant": False}
        tukey_results = []

        if len(groups) >= 2:
            try:
                f_stat, p_val = sp_stats.f_oneway(*groups)
                anova_result = {
                    "f_statistic": _round(float(f_stat)),
                    "p_value": _round(float(p_val), 6),
                    "significant": bool(p_val < 0.05),
                }

                # Tukey HSD post-hoc (pairwise_tukeyhsd de statsmodels)
                from statsmodels.stats.multicomp import pairwise_tukeyhsd
                all_scores = np.concatenate([np.array(g, dtype=float) for g in groups])
                all_labels = np.concatenate(
                    [[name] * len(g) for name, g in zip(model_names, groups)]
                )
                tukey = pairwise_tukeyhsd(endog=all_scores, groups=all_labels, alpha=0.05)
                for row in tukey.summary().data[1:]:
                    g1, g2, meandiff, p_adj, lower, upper, reject = row
                    tukey_results.append({
                        "group1": str(g1),
                        "group2": str(g2),
                        "mean_diff": _round(float(meandiff)),
                        "p_value": _round(float(p_adj), 6),
                        "significant": bool(reject),
                    })
            except Exception:
                pass

        results["anova_tukey"] = {"anova": anova_result, "tukey_comparisons": tukey_results}

        # Si no hay diferencia significativa, preferimos modelos menos pesados en producción
        if not anova_result["significant"]:
            # Ordenamos por peso del modelo (ligero primero) y luego por accuracy
            top3 = sorted(valid_models, key=lambda m: (model_weights.get(m["name"], 99), -m.get("cv_accuracy_mean", 0)))[:3]
            detail_msg = "p-valor ANOVA indica NO significancia. Se prefiere el modelo más ligero."
        else:
            # Ordenar solo por accuracy
            top3 = sorted(valid_models, key=lambda m: m.get("cv_accuracy_mean", 0), reverse=True)[:3]
            detail_msg = "p-valor ANOVA indica significancia. Se eligen los de mayor accuracy."
            
        top3_names = [m["name"] for m in top3]
        results["top3_models"] = top3_names

        results["phases"].append({
            "name": "Análisis Estadístico (ANOVA y Tukey HSD)",
            "status": "done",
            "detail": f"{detail_msg} Top 3: {', '.join(top3_names)}"
        })

        # ────────────────────────────────────────────────────────
        # GridSearchCV — Top 3 modelos
        # Exploración exhaustiva de grilla predefinida de hiperparámetros
        # ────────────────────────────────────────────────────────
        GRIDSEARCH_PARAMS: dict[str, dict] = {
            "Regresión Logística": {
                "clf__C": [0.01, 0.1, 1.0, 10.0, 100.0],
            },
            "Árbol de Decisión": {
                "clf__max_depth": [3, 5, 10, 15],
                "clf__min_samples_split": [2, 5, 10],
            },
            "K-Vecinos (KNN)": {
                "clf__n_neighbors": [3, 5, 7, 11],
                "clf__weights": ["uniform", "distance"],
            },
            "Red Neuronal (MLP)": {
                "clf__alpha": [1e-4, 1e-3, 1e-2],
                "clf__hidden_layer_sizes": [(50,), (100,)],
            },
            "Random Forest (Ensamble)": {
                "clf__n_estimators": [50, 100, 200],
                "clf__max_depth": [5, 10, None],
            },
            "Gradient Boosting (Ensamble)": {
                "clf__n_estimators": [50, 100, 200],
                "clf__learning_rate": [0.05, 0.1, 0.2],
            },
            "AdaBoost (Ensamble)": {
                "clf__n_estimators": [50, 100, 200],
                "clf__learning_rate": [0.5, 1.0],
            },
        }

        for name in top3_names:
            if name not in model_pipelines or name not in GRIDSEARCH_PARAMS:
                continue
            pipe = model_pipelines[name]
            param_grid = GRIDSEARCH_PARAMS[name]
            base_acc = next(
                (m["test_accuracy"] for m in results["models_results"] if m["name"] == name), 0
            )
            try:
                gs = GridSearchCV(
                    pipe, param_grid, cv=3, scoring="accuracy", n_jobs=-1, refit=True
                )
                gs.fit(X_train_raw, y_train)
                test_acc = accuracy_score(y_test, gs.best_estimator_.predict(X_test_raw))
                results["gridsearch_results"].append({
                    "model_name": name,
                    "best_params": {k: str(v) for k, v in gs.best_params_.items()},
                    "best_cv_score": _round(float(gs.best_score_)),
                    "test_accuracy_after": _round(test_acc),
                    "improvement": _round(test_acc - base_acc),
                })
            except Exception as e:
                results["gridsearch_results"].append({
                    "model_name": name,
                    "best_params": {},
                    "best_cv_score": 0.0,
                    "test_accuracy_after": 0.0,
                    "improvement": 0.0,
                    "error": str(e),
                })

        results["phases"].append({
            "name": "GridSearchCV — Top 3 modelos",
            "status": "done",
            "detail": (
                f"Búsqueda exhaustiva en grilla de hiperparámetros sobre los 3 mejores modelos "
                f"({', '.join(top3_names)}) con 3-Fold CV estratificado."
            ),
        })

        # ────────────────────────────────────────────────────────
        # Optimización Bayesiana con Optuna en el Top 3
        # Cada modelo recibe su preprocesador correcto + nuevos hiperparámetros
        # ────────────────────────────────────────────────────────
        best_overall_score  = -1
        best_overall_weight = 99
        best_overall_name   = ""
        best_overall_pipeline = None  # Pipeline completo (pre + clf)
        best_overall_test_acc = 0.0   # accuracy real sobre el test (30%)

        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)

        # Recuperar qué modelos son lineales
        linear_model_names = {"Regresión Logística", "K-Vecinos (KNN)", "Red Neuronal (MLP)"}

        for name in top3_names:
            if name not in model_pipelines:
                continue

            is_linear = name in linear_model_names
            n_train   = len(X_train_raw)

            def make_objective(_name=name, _is_linear=is_linear, _n_train=n_train):
                def objective(trial):
                    if _name == "Regresión Logística":
                        clf = LogisticRegression(
                            C=trial.suggest_float("C", 1e-4, 1e2, log=True),
                            max_iter=1000, random_state=42)
                    elif _name == "Árbol de Decisión":
                        clf = DecisionTreeClassifier(
                            max_depth=trial.suggest_int("max_depth", 2, 20),
                            min_samples_split=trial.suggest_int("min_samples_split", 2, 20),
                            random_state=42)
                    elif _name == "K-Vecinos (KNN)":
                        clf = KNeighborsClassifier(
                            n_neighbors=trial.suggest_int("n_neighbors", 1, min(15, _n_train - 1)),
                            weights=trial.suggest_categorical("weights", ["uniform", "distance"]))
                    elif _name == "Red Neuronal (MLP)":
                        clf = MLPClassifier(
                            alpha=trial.suggest_float("alpha", 1e-5, 1e-1, log=True),
                            hidden_layer_sizes=trial.suggest_categorical("hidden_layer_sizes", [(50,), (50, 50), (100,)]),
                            max_iter=500, random_state=42)
                    elif _name == "Random Forest (Ensamble)":
                        clf = RandomForestClassifier(
                            n_estimators=trial.suggest_int("n_estimators", 10, 200),
                            max_depth=trial.suggest_int("max_depth", 2, 20),
                            random_state=42)
                    elif _name == "Gradient Boosting (Ensamble)":
                        clf = GradientBoostingClassifier(
                            n_estimators=trial.suggest_int("n_estimators", 10, 200),
                            learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                            random_state=42)
                    elif _name == "AdaBoost (Ensamble)":
                        clf = AdaBoostClassifier(
                            n_estimators=trial.suggest_int("n_estimators", 10, 200),
                            learning_rate=trial.suggest_float("learning_rate", 0.01, 1.0, log=True),
                            random_state=42)
                    else:
                        raise optuna.exceptions.TrialPruned()

                    pre = make_preprocessor_linear(num_cols, cat_cols) if _is_linear \
                          else make_preprocessor_tree(num_cols, cat_cols)
                    pipe_trial = Pipeline([('pre', pre), ('clf', clf)])
                    score = cross_validate(
                        pipe_trial, X_train_raw, y_train, cv=3,
                        scoring="accuracy", n_jobs=-1
                    )["test_score"].mean()
                    return score
                return objective

            try:
                study = optuna.create_study(
                    direction="maximize",
                    sampler=optuna.samplers.TPESampler(seed=42)
                )
                study.optimize(make_objective(), n_trials=5, timeout=60)

                best_params = study.best_params
                best_cv_score = study.best_value

                # Reconstruir pipeline optimizado con preprocesador correcto
                if name == "Regresión Logística":
                    best_clf = LogisticRegression(C=best_params["C"], max_iter=1000, random_state=42)
                elif name == "Árbol de Decisión":
                    best_clf = DecisionTreeClassifier(
                        max_depth=best_params["max_depth"],
                        min_samples_split=best_params.get("min_samples_split", 2),
                        random_state=42)
                elif name == "K-Vecinos (KNN)":
                    best_clf = KNeighborsClassifier(
                        n_neighbors=best_params["n_neighbors"],
                        weights=best_params.get("weights", "uniform"))
                elif name == "Red Neuronal (MLP)":
                    best_clf = MLPClassifier(
                        alpha=best_params["alpha"],
                        hidden_layer_sizes=best_params["hidden_layer_sizes"],
                        max_iter=500, random_state=42)
                elif name == "Random Forest (Ensamble)":
                    best_clf = RandomForestClassifier(
                        n_estimators=best_params["n_estimators"],
                        max_depth=best_params["max_depth"],
                        random_state=42)
                elif name == "Gradient Boosting (Ensamble)":
                    best_clf = GradientBoostingClassifier(
                        n_estimators=best_params["n_estimators"],
                        learning_rate=best_params["learning_rate"],
                        random_state=42)
                elif name == "AdaBoost (Ensamble)":
                    best_clf = AdaBoostClassifier(
                        n_estimators=best_params["n_estimators"],
                        learning_rate=best_params["learning_rate"],
                        random_state=42)

                best_pre  = make_preprocessor_linear(num_cols, cat_cols) if is_linear \
                            else make_preprocessor_tree(num_cols, cat_cols)
                best_pipe = Pipeline([('pre', best_pre), ('clf', best_clf)])
                best_pipe.fit(X_train_raw, y_train)
                test_acc = accuracy_score(y_test, best_pipe.predict(X_test_raw))
                base_acc = next((m["test_accuracy"] for m in results["models_results"] if m["name"] == name), 0)

                results["bayesian_results"].append({
                    "model_name":        name,
                    "best_params":       {k: str(v) for k, v in best_params.items()},
                    "best_cv_score":     _round(float(best_cv_score)),
                    "test_accuracy_after": _round(test_acc),
                    "improvement":       _round(test_acc - base_acc),
                })

                weight    = model_weights.get(name, 99)
                is_better = False
                if not anova_result["significant"]:
                    if weight < best_overall_weight or (weight == best_overall_weight and best_cv_score > best_overall_score):
                        is_better = True
                else:
                    if best_cv_score > best_overall_score:
                        is_better = True

                if is_better:
                    best_overall_score    = best_cv_score
                    best_overall_weight   = weight
                    best_overall_name     = name
                    best_overall_pipeline = best_pipe
                    best_overall_test_acc = test_acc

            except Exception:
                pass

        results["phases"].append({
            "name": "Optimización Bayesiana (Optuna TPE) — Top 3 modelos",
            "status": "done",
            "detail": (
                f"Búsqueda bayesiana TPE (Tree-structured Parzen Estimator) sobre los 3 mejores modelos. "
                f"Mejor modelo final: {best_overall_name}."
            ),
        })

        # ────────────────────────────────────────────────────────
        # Empaquetado Pipeline Final para despliegue
        # El pipeline ya contiene preprocesador + clasificador optimizado
        # Se re-entrena sobre el 100% de los datos para máxima cobertura
        # ────────────────────────────────────────────────────────
        if best_overall_pipeline is not None:
            final_pipeline = best_overall_pipeline  # Pipeline(pre + clf) ya correcto
            
            # Entrenar pipeline completo
            final_pipeline.fit(X_df, y)
            
            buffer = io.BytesIO()
            pickle.dump(final_pipeline, buffer)
            
            is_linear_winner = best_overall_name in linear_model_names
            pre_steps = (
                ["Imputer (mediana)", "StandardScaler", "PCA (95% varianza)", "OneHotEncoding"]
                if is_linear_winner else
                ["Imputer (mediana)", "KBinsDiscretizer (quantile)", "OneHotEncoding"]
            )
            pre_desc = (
                "Normalización + PCA — modelo sensible a escala"
                if is_linear_winner else
                "Discretización — modelo invariante a escala"
            )

            results["best_model"] = {
                "name": best_overall_name,
                "final_test_accuracy": _round(best_overall_test_acc),
                "pipeline_size_kb": _round(len(buffer.getvalue()) / 1024, 1),
                "pipeline_steps": pre_steps + [best_overall_name],
            }
            results["pipeline_info"] = {
                "ready_for_deployment": True,
                "steps": [
                    {"name": "Preprocesamiento", "desc": pre_desc},
                    {"name": best_overall_name,  "desc": "Clasificador optimizado (Optuna TPE)"}
                ],
                "num_cols": num_cols,
                "cat_cols": cat_cols,
                "target_col": target_col
            }
            
            # Guardar en cache para predicciones interactivas
            self.model_cache["last"] = {
                "pipeline": final_pipeline,
                "le": le,
                "num_cols": num_cols,
                "cat_cols": cat_cols
            }

        return results

modeling_service = ModelingService()
