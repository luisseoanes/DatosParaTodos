from __future__ import annotations

import json
import math
import re
from typing import Any


class AnalyticsService:
    _DATE_PATTERN = re.compile(r"\d{4}-\d{2}")

    @staticmethod
    def _is_empty(value: Any) -> bool:
        return value is None or value == ""

    @staticmethod
    def _to_float(value: Any) -> float | None:
        if value is None:
            return None
        if isinstance(value, bool):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _round(value: float, digits: int = 2) -> float:
        return round(value, digits)

    def detect_columns(self, data: list[dict[str, Any]]) -> dict[str, list[str]]:
        if not data:
            return {"numeric": [], "date": [], "categorical": [], "all": []}

        sample = data[: min(50, len(data))]
        all_cols = list(data[0].keys())
        numeric: list[str] = []
        date: list[str] = []
        categorical: list[str] = []

        for col in all_cols:
            vals = [row.get(col) for row in sample if not self._is_empty(row.get(col))]
            if not vals:
                categorical.append(col)
                continue

            num_vals = [v for v in vals if self._to_float(v) is not None]
            date_vals = [v for v in vals if isinstance(v, str) and self._DATE_PATTERN.search(v)]

            if len(num_vals) > len(vals) * 0.6:
                numeric.append(col)
            elif len(date_vals) > len(vals) * 0.5:
                date.append(col)
            else:
                categorical.append(col)

        return {"numeric": numeric, "date": date, "categorical": categorical, "all": all_cols}

    def analyze_data(self, data: list[dict[str, Any]]) -> dict[str, Any]:
        if not data:
            return {"cols": {"numeric": [], "date": [], "categorical": [], "all": []}, "stats": {}, "rowCount": 0}

        cols = self.detect_columns(data)
        stats: dict[str, dict[str, Any]] = {}

        for col in cols["all"]:
            vals = [row.get(col) for row in data]
            nulls = sum(1 for value in vals if self._is_empty(value))
            nums = [v for v in (self._to_float(value) for value in vals) if v is not None]
            is_num = col in cols["numeric"]

            mean = None
            median = None
            std = None
            min_value = None
            max_value = None

            if is_num and nums:
                mean_val = sum(nums) / len(nums)
                ordered = sorted(nums)
                median_val = ordered[len(ordered) // 2]
                variance = sum((value - mean_val) ** 2 for value in nums) / len(nums)
                std_val = math.sqrt(variance)

                mean = self._round(mean_val)
                median = self._round(median_val)
                std = self._round(std_val)
                min_value = min(nums)
                max_value = max(nums)

            unique_count = len({value for value in vals if not self._is_empty(value)})
            total = len(vals)
            null_pct = self._round((nulls / total) * 100, 1) if total else 0.0

            stats[col] = {
                "type": "numeric" if col in cols["numeric"] else "date" if col in cols["date"] else "categorical",
                "total": total,
                "nullCount": nulls,
                "nullPct": null_pct,
                "uniqueCount": unique_count,
                "mean": mean,
                "median": median,
                "std": std,
                "min": min_value,
                "max": max_value,
            }

        return {"cols": cols, "stats": stats, "rowCount": len(data)}

    def run_cleaning_pipeline(self, raw_data: list[dict[str, Any]]) -> dict[str, Any]:
        if not raw_data:
            return {"cleanData": [], "issues": [], "score": 0, "steps": 0}

        issues: list[dict[str, Any]] = []
        data = [dict(row) for row in raw_data]
        cols = self.detect_columns(data)

        # Step 1: remove duplicates
        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for row in data:
            key = json.dumps(row, sort_keys=True, default=str)
            if key in seen:
                issues.append(
                    {
                        "tipo": "Duplicado",
                        "campo": "toda la fila",
                        "original": "Fila repetida",
                        "accion": "Eliminada",
                    }
                )
                continue
            seen.add(key)
            deduped.append(row)

        # Step 2: fill nulls
        numeric_medians: dict[str, float] = {}
        for col in cols["numeric"]:
            vals = [v for v in (self._to_float(r.get(col)) for r in deduped) if v is not None]
            vals.sort()
            numeric_medians[col] = vals[len(vals) // 2] if vals else 0.0

        filled: list[dict[str, Any]] = []
        for row in deduped:
            clean_row = dict(row)
            for col in cols["numeric"]:
                if self._is_empty(clean_row.get(col)):
                    replacement = numeric_medians[col]
                    clean_row[col] = replacement
                    issues.append(
                        {
                            "tipo": "Valor vacio",
                            "campo": col,
                            "original": "NULL",
                            "accion": f"Mediana: {replacement}",
                        }
                    )
            for col in cols["categorical"]:
                if self._is_empty(clean_row.get(col)):
                    clean_row[col] = "No especificado"
                    issues.append(
                        {
                            "tipo": "Valor vacio",
                            "campo": col,
                            "original": "NULL",
                            "accion": '"No especificado"',
                        }
                    )
            filled.append(clean_row)

        # Step 3: cap outliers using IQR
        cleaned = [dict(row) for row in filled]
        bounds: dict[str, tuple[float, float]] = {}
        for col in cols["numeric"]:
            vals = [v for v in (self._to_float(r.get(col)) for r in filled) if v is not None]
            vals.sort()
            if len(vals) < 4:
                continue
            q1 = vals[int(len(vals) * 0.25)]
            q3 = vals[int(len(vals) * 0.75)]
            iqr = q3 - q1
            bounds[col] = (q1 - 1.5 * iqr, q3 + 1.5 * iqr)

        for row in cleaned:
            for col, (low, high) in bounds.items():
                value = self._to_float(row.get(col))
                if value is None:
                    continue
                if value < low or value > high:
                    capped = self._round(low if value < low else high)
                    issues.append(
                        {
                            "tipo": "Outlier",
                            "campo": col,
                            "original": value,
                            "accion": f"Corregido a {capped}",
                        }
                    )
                    row[col] = capped

        # Step 4: normalize types/formats
        normalized: list[dict[str, Any]] = []
        for row in cleaned:
            clean_row = dict(row)
            for col in cols["numeric"]:
                value = clean_row.get(col)
                if isinstance(value, str):
                    clean_row[col] = self._to_float(value) or 0.0
            for col in cols["categorical"]:
                value = clean_row.get(col)
                if isinstance(value, str):
                    clean_row[col] = value.strip()
            normalized.append(clean_row)

        total_cells = len(normalized) * len(cols["all"])
        remaining_nulls = 0
        for col in cols["all"]:
            remaining_nulls += sum(1 for row in normalized if self._is_empty(row.get(col)))

        completeness = max(0.0, 100.0 - ((remaining_nulls / total_cells) * 100.0 if total_cells else 0.0))
        unique_rows = len({json.dumps(row, sort_keys=True, default=str) for row in normalized})
        uniqueness = min(100.0, (unique_rows / len(normalized)) * 100.0 if normalized else 0.0)
        score = round(completeness * 0.6 + uniqueness * 0.4)

        return {
            "cleanData": normalized,
            "issues": issues,
            "score": score,
            "steps": 6,
        }

    def simple_prediction(self, values: list[float], steps: int = 10) -> dict[str, Any]:
        numeric_values = [float(v) for v in values if v is not None]
        n = len(numeric_values)
        if n < 3:
            return {
                "predictions": [],
                "confidence": [],
                "slope": None,
                "intercept": None,
                "residStd": None,
                "direction": None,
            }

        xs = list(range(n))
        x_mean = sum(xs) / n
        y_mean = sum(numeric_values) / n
        numerator = sum((x - x_mean) * (numeric_values[i] - y_mean) for i, x in enumerate(xs))
        denominator = sum((x - x_mean) ** 2 for x in xs)
        slope = numerator / denominator if denominator else 0.0
        intercept = y_mean - slope * x_mean

        residuals = [value - (slope * i + intercept) for i, value in enumerate(numeric_values)]
        resid_std = math.sqrt(sum(r * r for r in residuals) / n)

        window_size = min(5, max(1, n // 3))
        last_smooth = sum(numeric_values[-window_size:]) / window_size
        trend_from_smooth = last_smooth - (slope * (n - window_size / 2) + intercept)

        predictions: list[float] = []
        confidence: list[dict[str, float]] = []

        for i in range(steps):
            x = n + i
            trend = slope * x + intercept
            seasonal = math.sin(i * 0.6) * resid_std * 0.2
            pred = self._round(trend + trend_from_smooth * 0.3 + seasonal)
            predictions.append(pred)
            confidence.append(
                {
                    "low": self._round(pred - resid_std),
                    "high": self._round(pred + resid_std),
                }
            )

        direction = "alza" if slope > 0.01 else "baja" if slope < -0.01 else "estable"

        return {
            "predictions": predictions,
            "confidence": confidence,
            "slope": self._round(slope, 6),
            "intercept": self._round(intercept, 6),
            "residStd": self._round(resid_std, 6),
            "direction": direction,
        }


analytics_service = AnalyticsService()
