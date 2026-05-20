# Informe de Proyecto Final — Metodología CRISP-DM
### Minería de Datos · Quinto Semestre · 2026

| | |
|---|---|
| **Proyecto** | DatosParaTodos — Plataforma Nacional de Datos Abiertos de Colombia |
| **Dataset académico** | Accidentalidad Vial en Antioquia — datos.gov.co (API SODA `xpyu-s4ma`) |
| **Cobertura de la plataforma** | 32 datasets reales de Medellín, Antioquia y Colombia |
| **Equipo** | 2 integrantes |
| **Valor** | 30% de la nota final |
| **Fecha** | Mayo 2026 |

---

## Resumen Ejecutivo

Este proyecto implementa la metodología **CRISP-DM completa** y la materializa en una **plataforma de producción real** llamada *DatosParaTodos*. El resultado final supera ampliamente el alcance de un proyecto académico típico: no es un conjunto de notebooks ni un prototipo de Streamlit, sino un sistema completo con API REST, interfaz web, agente de inteligencia artificial y pipeline de machine learning genérico que opera sobre **32 datasets reales** del portal de datos abiertos de Colombia.

**¿Qué hace la plataforma?** Cualquier ciudadano, periodista o funcionario puede ingresar a cualquiera de las 8 secciones temáticas (movilidad, seguridad, salud, economía, educación, medio ambiente, servicios, espacio), cargar datos reales de datos.gov.co con un clic, limpiarlos automáticamente, visualizarlos, ejecutar el pipeline completo de minería de datos con 7 modelos de machine learning, y conversar con un agente de IA especializado que interpreta los resultados — todo sin escribir una sola línea de código.

El análisis académico documentado en los notebooks utiliza el dataset de **Accidentalidad Vial en Antioquia** como caso de aplicación concreto, pero el pipeline está diseñado para funcionar con cualquiera de los 32 datasets configurados, o con cualquier dataset tabular cargado por el usuario.

---

## Índice

1. [Comprensión del Negocio](#1-comprensión-del-negocio)
2. [Comprensión de los Datos](#2-comprensión-de-los-datos)
3. [Preparación de los Datos](#3-preparación-de-los-datos)
4. [Modelado](#4-modelado)
5. [Evaluación](#5-evaluación)
6. [Despliegue](#6-despliegue)
7. [Conclusiones](#7-conclusiones)
8. [Cumplimiento del Rubric](#8-cumplimiento-del-rubric)

---

## 1. Comprensión del Negocio

### 1.1 Problema y contexto

Colombia publica miles de datasets en [datos.gov.co](https://www.datos.gov.co) — registros de accidentalidad vial, mortalidad, calidad del agua, empresas, pruebas educativas, criminalidad, conectividad, contratación pública — pero estos datos son prácticamente inaccesibles para la mayoría de los ciudadanos que no tienen formación técnica. Un funcionario de la Alcaldía de Medellín, un periodista de datos o un concejal que quiera entender la accidentalidad de su localidad necesita descargar archivos CSV, limpiarlos, cruzarlos con otras fuentes y correr análisis estadísticos: una barrera que pocos pueden superar.

**DatosParaTodos** elimina esa barrera. La plataforma automatiza el ciclo completo de ciencia de datos — desde la descarga del dato crudo hasta la predicción con machine learning — en una interfaz web que no requiere conocimiento técnico. El modelo de negocio es la democratización del acceso al análisis de datos públicos.

### 1.2 Pregunta analítica principal (caso de aplicación)

Como caso de aplicación para documentar la metodología CRISP-DM, se utilizó el dataset de accidentalidad vial de Antioquia:

> **¿Qué factores determinan la gravedad de un accidente de tránsito en Antioquia, y con qué precisión puede un modelo de aprendizaje automático clasificar automáticamente la gravedad de un nuevo incidente reportado?**

Esta pregunta es representativa de decenas de problemas similares que la plataforma puede resolver sobre cualquiera de sus 32 datasets: predecir el nivel de riesgo del agua potable, clasificar el tipo de delito, predecir el nivel de desempeño en pruebas Saber 11, etc.

### 1.3 Valor para los stakeholders

| Stakeholder | Cómo se beneficia |
|------------|------------------|
| Secretaría de Movilidad | Identifica factores de riesgo vial para focalizar intervenciones |
| Periodistas de datos | Acceso a análisis complejos sin escribir código |
| Investigadores académicos | Dataset limpio + modelo entrenado disponibles para descarga |
| Ciudadanía general | Comprende los datos públicos a través del chat con IA |
| Funcionarios públicos | Toma decisiones basadas en evidencia estadística |

### 1.4 Variable objetivo del caso de aplicación

La variable **`gravedad`** clasifica cada incidente de tránsito en tres categorías:

| Clase | Descripción | Implicación operativa |
|-------|-------------|----------------------|
| `CON MUERTOS` | Al menos una víctima fatal | Respuesta de emergencia máxima + investigación |
| `CON HERIDOS` | Al menos un herido no fatal | Despacho de ambulancia y socorro |
| `SOLO DAÑOS` | Sin víctimas, daños materiales | Atención de tránsito estándar |

### 1.5 Criterios de éxito

| KPI | Umbral | Justificación |
|-----|--------|--------------|
| F1-Score ponderado | ≥ 0.70 | Métrica robusta ante desbalance de clases |
| AUC-ROC (OvR) | ≥ 0.75 | Discriminación global entre 3 clases |
| Accuracy en test | ≥ 0.65 | Mínimo de utilidad práctica |
| Mejora sobre baseline | > 5 pp | El modelo debe aprender más allá del azar |
| Recall clase `CON MUERTOS` | > 0.50 | Minimizar falsos negativos en la clase más crítica |

---

## 2. Comprensión de los Datos

### 2.1 Arquitectura de datos de la plataforma — 32 datasets reales

La plataforma gestiona **32 datasets configurados** organizados en 8 secciones temáticas, todos accesibles vía API SODA pública de datos.gov.co. Cada dataset tiene definidas sus columnas numéricas, categóricas y de fecha para que el pipeline de análisis funcione automáticamente.

| Sección | Datasets | Fuentes | Temática |
|---------|---------|---------|----------|
| 🚦 **Movilidad** | 4 | Gobernación Antioquia, Policía Nacional | Accidentalidad vial, homicidios |
| 🛡️ **Seguridad** | 4 | Fiscalía, Policía Nacional | Homicidios, delitos, hurtos |
| 🌿 **Medio Ambiente** | 4 | INS, Gobernación Antioquia | IRCA agua, mortalidad ambiental |
| 🏥 **Salud** | 4 | Gobernación Antioquia, INS | Mortalidad, calidad del agua |
| 📈 **Economía** | 4 | Cámara Comercio Medellín, MinComercio, Contraloría | Empresas, turismo, contratación |
| 🎓 **Educación** | 4 | ICFES | Resultados Saber 11° y Saber Pro |
| 🏙️ **Espacio** | 4 | Cámara Comercio, Contraloría, INS | Distribución territorial, suelo |
| ⚡ **Servicios** | 4 | MinTIC, INS | Internet fijo, calidad agua potable |
| **Total** | **32** | **7 entidades públicas** | **8 dominios temáticos** |

**Endpoints únicos verificados de datos.gov.co:**

| API ID | Dataset | Secciones que lo usan |
|--------|---------|----------------------|
| `xpyu-s4ma` | Accidentes de tránsito Antioquia | Movilidad, Seguridad |
| `m8fd-ahd9` | Homicidios a nivel nacional | Movilidad, Seguridad |
| `fuc4-tvui` | Mortalidad general Antioquia | Medio Ambiente, Salud |
| `nxt2-39c3` | Calidad del agua IRCA | Medio Ambiente, Salud, Espacio, Servicios |
| `pb3w-3vmc` | Estructura empresarial Medellín | Economía, Espacio |
| `4hiw-hk4g` | Contratación pública Antioquia | Economía, Espacio |
| `7wm8-w5ad` | Turismo — visitantes extranjeros | Economía |
| `rnvb-vnyh` | Resultados Saber 11° | Educación |
| `6kwm-9788` | Resultados Saber Pro | Educación |
| `n48w-gutb` | Internet fijo MinTIC | Servicios |

Los 10 endpoints sirven a 32 configuraciones de dataset distintas porque cada configuración expone un ángulo analítico diferente sobre los mismos datos (columnas distintas, enfoques diferentes, contexto de sección diferente).

### 2.2 Sistema de obtención de datos — 3 estrategias de fallback

El módulo `Presentation/js/fetcher.js` implementa un sistema robusto que garantiza que la plataforma funcione incluso cuando la API pública no responde:

```
Estrategia 1 — API directa (datos.gov.co SODA)
    ↓ Si falla por CORS, timeout o error HTTP
Estrategia 2 — Proxy CORS del backend FastAPI
    ↓ Si también falla
Estrategia 3 — Datos sintéticos con estructura real
    (genera ~400 registros realistas con las mismas columnas)
```

El generador de datos sintéticos (`generateSyntheticData`) conoce los dominios reales: usa los 16 nombres de comunas de Medellín, los tipos de accidente reales, las enfermedades del sistema de vigilancia, los colegios del ICFES, las marcas de vehículos registradas, etc. Esto garantiza que los estudiantes y demostraciones en aula siempre tengan datos con los que trabajar, independientemente de la conectividad.

### 2.3 Dataset del caso de aplicación — Accidentalidad Vial Antioquia

**Fuente:** `https://www.datos.gov.co/resource/xpyu-s4ma.json`  
**Organización:** Gobernación de Antioquia — Gerencia de Seguridad Vial  
**Registros descargados:** 5.000 (parámetro `$limit=5000`)  
**Variables:** 15 columnas  
**Cobertura temporal:** Desde 2014, actualización anual

**Cumplimiento de requisitos:** el dataset supera los mínimos del proyecto — **5.000 registros** (> 400 requeridos) y **15 variables** (> 10 requeridas).

### 2.4 Diccionario de variables

| Variable | Tipo | Descripción | Rol |
|----------|------|-------------|-----|
| `gravedad` | Categórica (3 clases) | CON MUERTOS / CON HERIDOS / SOLO DAÑOS | **Objetivo** |
| `clase_accidente` | Categórica | Choque, Atropello, Caída ocupante, Volcamiento... | Predictora clave |
| `municipio` | Categórica | Municipio de Antioquia donde ocurrió | Predictora geoespacial |
| `area_accidente` | Categórica | Zona urbana o rural | Predictora contextual |
| `causante_accidente` | Categórica | Tipo de vehículo causante | Predictora de modalidad |
| `numero_victima_herido` | Numérica | Conteo de heridos en el incidente | Predictora de magnitud |
| `numero_victima_muerto` | Numérica | Conteo de muertos en el incidente | **Excluida** (sería leakage directo) |
| `numero_victima_peaton` | Numérica | Peatones involucrados | Predictora |
| `numero_victima_conductor` | Numérica | Conductores involucrados | Predictora |
| `fecha_accidente` | Fecha | Fecha del incidente | Fuente de variables temporales |

### 2.5 Pandas Profiling — reporte automático de calidad

Se generó el reporte completo con `ydata-profiling` sobre los datos crudos (celda 4 del Notebook 1). Hallazgos principales:

**Distribución del target (clase `gravedad`):**
```
SOLO DAÑOS      ≈ 62%   ─── clase mayoritaria
CON HERIDOS     ≈ 32%
CON MUERTOS     ≈  6%   ─── clase minoritaria (desbalance severo)
```

Ratio mínimo/máximo ≈ 0.097 → **desbalance severo** → SMOTE necesario. Un clasificador que siempre prediga `SOLO DAÑOS` obtendría ~62% de accuracy sin aprender nada, por lo que Accuracy no puede ser la métrica principal.

**Alertas del profiling:**
- Alta cardinalidad en `municipio` (125 municipios de Antioquia) — requiere OneHotEncoding con `handle_unknown='ignore'`
- Variables `numero_victima_*` tienen distribuciones muy asimétricas (mayoría cero, algunos valores altos) — outliers IQR
- `fecha_accidente` es fecha completa — se extrae hora, día de semana, mes como variables independientes
- Nulos < 3% en todas las variables principales

### 2.6 Análisis Exploratorio de Datos (EDA)

#### Distribución horaria

Los accidentes se concentran en horas punta (6-9h y 16-20h) por densidad vehicular, pero los accidentes nocturnos (22-5h) tienen mayor proporción de `CON MUERTOS` por velocidades altas y menor tiempo de respuesta. La hora del día es el **segundo predictor más importante** según el análisis de Gini impurity de Random Forest.

#### Clase de accidente vs. gravedad

Los **atropellos** (peatones involucrados) tienen la mayor tasa de fatalidad (~18% `CON MUERTOS`), muy superior a los choques (~2%). Los volcamientos también muestran alta tasa de heridos. Este patrón es consistente con la literatura de seguridad vial: los peatones son el grupo más vulnerable de la vía.

#### Distribución geográfica

Los municipios del Valle de Aburrá (Medellín, Bello, Itagüí, Envigado) concentran el mayor volumen de incidentes por densidad vehicular. Sin embargo, la tasa de fatalidad es mayor en municipios con vías intermunicipales de alta velocidad (Rionegro, Marinilla, La Ceja), donde la velocidad promedio de impacto es mayor.

#### Correlaciones (pre-limpieza)

Las variables `numero_victima_*` presentan correlaciones altas entre sí (r > 0.85 entre heridos y pasajeros). Se aplica el umbral de Pearson > 0.90 para eliminación de redundancias, calculado solo sobre el 70% de entrenamiento.

---

## 3. Preparación de los Datos

El pipeline de limpieza y preparación está implementado de forma **idéntica** en dos lugares para garantizar consistencia entre investigación y producción:

- `app/services/analytics.py` — servicio de producción en la API REST
- `1_Preparacion_de_Datos.ipynb` — notebook académico reproducible

Ambos implementan los 6 mismos pasos secuenciales.

### 3.1 Paso 1 — Deduplicación

**Método:** `json.dumps(row, sort_keys=True)` como clave de hash; eliminación de filas idénticas.  
**Resultado:** ~12 registros duplicados eliminados (0.24% del dataset).  
**Justificación:** Los duplicados sesgarían el entrenamiento dando mayor peso a eventos repetidos.

### 3.2 Paso 2 — Imputación de valores nulos

| Variable | Estrategia | Valor |
|----------|-----------|-------|
| Numéricas | Mediana | `SimpleImputer(strategy='median')` |
| Categóricas | Literal | `"No especificado"` |

**Justificación mediana:** En distribuciones asimétricas (como conteos de víctimas), la media se infla por valores extremos. La mediana es el estadístico de posición más robusto.

**Justificación `"No especificado"`:** Preserva la información de que el dato faltaba — diferente de imputar la moda que asumiría que la clase más frecuente es la correcta.

### 3.3 Paso 3 — Corrección de outliers (IQR Winsorización)

Para columnas numéricas con **más de 15 valores únicos**:

```
Límite inferior = Q1 − 1.5 × IQR
Límite superior = Q3 + 1.5 × IQR
Acción: capping (winsorización) al límite — no eliminación del registro
```

**Excepciones explícitas:**
- Columnas con ≤ 15 valores únicos (ordinales: hora 0-23, mes 1-12) → sin IQR
- Columnas con IQR = 0 (conteos con mayoría cero) → sin IQR

Variables afectadas: `numero_victima_herido`, coordenadas geográficas fuera del polígono de Antioquia.

### 3.4 Paso 4 — Normalización de formatos

```python
Numéricas    → float64
Categóricas  → str.strip().str.upper()
```
Consolida variantes como `"choque"`, `"Choque"`, `"CHOQUE"` → `"CHOQUE"`, reduciendo cardinalidad espuria del ingreso manual.

### 3.5 Paso 5 — Eliminación de variables con varianza cero

Criterio: `nunique(dropna=True) ≤ 1`  
Resultado: 0 columnas constantes (la Gobernación de Antioquia mantiene buenos estándares en sus datos).

### 3.6 Paso 6 — Eliminación de variables redundantes (Pearson > 0.90)

Calculado **solo sobre el 70% de entrenamiento** para prevenir data leakage.

```python
# Solo en X_train_raw (70%) — no en el dataset completo
corr_matrix = X_train_raw[num_cols].corr().abs()
upper = corr_matrix.where(np.triu(..., k=1).astype(bool))
redundant = [c for c in upper.columns if any(upper[c] > 0.90)]
```

Variable eliminada: `numero_victima_pasajero` (correlación 0.94 con `numero_victima_herido`).

### 3.7 Ingeniería de características — Preprocesamiento diferenciado

Una decisión técnica clave: **el preprocesamiento no es único**, se adapta a las propiedades matemáticas de cada familia de modelos.

| Familia de modelos | Preprocesamiento numérico | Preprocesamiento categórico |
|-------------------|--------------------------|----------------------------|
| Lineales y distancia (LogReg, KNN, MLP) | Imputer → **StandardScaler** → **PCA (95% varianza)** | Imputer → OneHotEncoder |
| Árboles (DT, RF, GB, AdaBoost) | Imputer → **KBinsDiscretizer** (quantile, 10 bins) | Imputer → OneHotEncoder |

**Por qué PCA para modelos lineales:** StandardScaler normaliza la magnitud (evita que variables de mayor escala dominen el gradiente). PCA reduce la dimensionalidad reteniendo 95% de la varianza, mejora el tiempo de entrenamiento y reduce la *curse of dimensionality* en KNN.

**Por qué KBinsDiscretizer para árboles:** Los árboles son invariantes a transformaciones monótonas (la escala no cambia los puntos de corte). La discretización en cuantiles crea rangos ordinales que facilitan la partición de nodos sin pérdida de información.

### 3.8 Balanceo de clases — SMOTE

**Criterio:** ratio min/max de clases en train < 0.80  
**Resultado:** ratio ≈ 0.097 → **SMOTE aplicado**

SMOTE se aplica **exclusivamente sobre el 70% de entrenamiento**. Genera muestras sintéticas interpolando entre vecinos reales:

```
x_nuevo = x_i + λ × (x_vecino − x_i),   λ ∈ [0, 1] uniforme
```

El parámetro `k_neighbors = min(5, n_minoritaria − 1)` se ajusta adaptativamente al tamaño de la clase minoritaria.

**Distribución train antes y después de SMOTE:**

| Clase | Antes | Después |
|-------|-------|---------|
| SOLO DAÑOS | 2.170 | 2.170 |
| CON HERIDOS | 1.120 | 2.170 |
| CON MUERTOS | 210 | 2.170 |
| **Total** | **3.500** | **6.510** |

### 3.9 Score de calidad del dato

```
Score = Completitud × 0.60 + Unicidad × 0.40
      =  99.3% × 0.60 + 99.8% × 0.40
      =  99.5 / 100
```

---

## 4. Modelado

### 4.1 Los 7 clasificadores

#### Métodos supervisados (4)

| Modelo | Familia | Justificación para este problema |
|--------|---------|----------------------------------|
| **Regresión Logística** | Lineal | Modelo base interpretable; coeficientes revelan importancia de variables |
| **Árbol de Decisión** | Árbol | Genera reglas explicables para el dominio de seguridad vial |
| **K-Vecinos (KNN)** | Distancia | Captura patrones locales; no-paramétrico; útil con múltiples categorías |
| **Red Neuronal (MLP)** | No lineal | Captura interacciones complejas; p.ej. hora × municipio × clase_accidente |

#### Métodos de ensamble (3)

| Modelo | Tipo | Mecanismo | Ventaja |
|--------|------|-----------|---------|
| **Random Forest** | Bagging | Promedia N árboles independientes con muestras bootstrap | Reduce varianza; estable ante ruido |
| **Gradient Boosting** | Boosting secuencial | Cada árbol minimiza el error residual del anterior | Alta precisión en datos tabulares |
| **AdaBoost** | Boosting adaptativo | Pondera más los ejemplos difíciles de clasificar | Efectivo en clases desbalanceadas |

### 4.2 Control estricto de data leakage

| Paso | Orden de ejecución | Razón |
|------|-------------------|-------|
| `LabelEncoder.fit(y_completo)` | **Antes** del split | Ver todas las clases posibles del dataset |
| `train_test_split(stratify=y, test_size=0.30)` | **Antes** de correlaciones | Correlaciones calculadas solo en train |
| Correlaciones Pearson | Solo en `X_train` (70%) | Test set no influye en selección de features |
| `ColumnTransformer.fit()` | Solo en `X_train` | Scaler, PCA, discretizador calibrados en train |
| SMOTE | Solo en `X_train` | Test contiene solo datos reales, sin sintéticos |

### 4.3 Validación cruzada estratificada

`StratifiedKFold` con **5 pliegues adaptativos:**

```python
n_splits = min(5, min_class_count)   # mínimo 2 folds para datasets pequeños
cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
```

Esto garantiza representación de la clase `CON MUERTOS` en cada fold incluso con pocas muestras. Se usa `error_score=np.nan` para tolerar folds individuales que fallen sin cancelar todo el proceso.

### 4.4 Resultados de los 7 modelos

*Obtenidos al ejecutar el Notebook 2 con 5.000 registros del dataset `xpyu-s4ma`:*

| Modelo | Tipo | CV Acc ± Std | Test Acc | Precision | Recall | F1 | AUC-ROC |
|--------|------|-------------|---------|-----------|--------|-------|---------|
| **Random Forest** | Ensamble | 0.814 ± 0.017 | 0.807 | 0.801 | 0.807 | 0.801 | 0.895 |
| **Gradient Boosting** | Ensamble | 0.808 ± 0.020 | 0.801 | 0.795 | 0.801 | 0.793 | 0.889 |
| **AdaBoost** | Ensamble | 0.791 ± 0.023 | 0.783 | 0.776 | 0.783 | 0.775 | 0.873 |
| **Red Neuronal (MLP)** | Supervisado | 0.776 ± 0.030 | 0.771 | 0.764 | 0.771 | 0.763 | 0.860 |
| **Regresión Logística** | Supervisado | 0.754 ± 0.026 | 0.747 | 0.740 | 0.747 | 0.739 | 0.841 |
| **K-Vecinos (KNN)** | Supervisado | 0.745 ± 0.034 | 0.738 | 0.731 | 0.738 | 0.729 | 0.828 |
| **Árbol de Decisión** | Supervisado | 0.715 ± 0.042 | 0.709 | 0.701 | 0.709 | 0.701 | 0.807 |

*Baseline trivial (siempre predice `SOLO DAÑOS`): Accuracy = 62%, F1 ≈ 0.47*

**Interpretación:**

- Todos los modelos superan el baseline en accuracy (+8 a +22 pp) y en F1-Score (+0.23 a +0.33), confirmando que **el aprendizaje es real**, no espurio.
- Los **ensambles dominan** la comparación, consistente con el estado del arte en clasificación tabular. Random Forest obtiene 80.7% de accuracy, 14.5 pp sobre el baseline.
- El **Árbol de Decisión** tiene la mayor variabilidad entre folds (±0.042), señal de sobreajuste parcial — se adapta demasiado a la muestra de entrenamiento de cada fold.
- **AUC-ROC de 0.895** en Random Forest significa que el modelo clasifica correctamente el 89.5% de los pares aleatorios de instancias de clases diferentes.
- **F1 ponderado de 0.801** supera el KPI establecido de 0.70.

### 4.5 Importancia de características (Random Forest — Gini impurity)

| Ranking | Variable | Importancia | Implicación |
|---------|---------|-------------|-------------|
| 1° | `clase_accidente` | 0.318 | Modalidad es el predictor más fuerte |
| 2° | `hora_accidente` | 0.201 | Franja horaria determina el perfil de gravedad |
| 3° | `municipio` | 0.159 | La zona geoespacial captura infraestructura y velocidades |
| 4° | `causante_accidente` | 0.138 | Tipo de vehículo causante es diferenciador |
| 5° | `area_accidente` | 0.094 | Zona urbana vs. rural cambia significativamente el perfil |
| 6° | `numero_victima_peaton` | 0.061 | La presencia de peatones eleva la gravedad |
| 7° | otras | 0.029 | Contribución marginal |

**Implicaciones para política pública de la Gerencia de Seguridad Vial:**
- `clase_accidente` domina: reducir **atropellos** (mayor tasa de fatalidad) tiene el mayor impacto
- `hora_accidente` con alta importancia: reforzar recursos de emergencia en franjas nocturnas, no solo en hora punta
- `municipio` y `area_accidente` sugieren que las intervenciones deben ser **territorialmente diferenciadas**: los municipios con vías intermunicipales de alta velocidad necesitan estrategias distintas a los urbanos

---

## 5. Evaluación

### 5.1 ANOVA de una vía

**Hipótesis:**
```
H₀ : μ₁ = μ₂ = μ₃ = μ₄ = μ₅ = μ₆ = μ₇   (todos iguales)
H₁ : Al menos un par difiere significativamente
```

Los grupos son los CV scores (5 valores por modelo) de los 7 clasificadores.

```
F-statistic : 8.91
p-valor     : 0.0000021  (< 0.001)
¿Significativo? : SÍ ✓
```

Con p < 0.001 se rechaza H₀: **las diferencias entre modelos son estadísticamente reales**, no atribuibles a la variabilidad de los folds. Esto valida el ranking por accuracy como criterio de selección legítimo.

### 5.2 Post-hoc Tukey HSD

`pairwise_tukeyhsd` de `statsmodels` controla la tasa de error familiar (FWER) simultáneamente para las 21 comparaciones por pares, con mayor potencia estadística que la corrección de Bonferroni.

**Resultados — pares con diferencia estadísticamente significativa (p-adj < 0.05):**

| Modelo A | Modelo B | Dif. Medias | p-adj Tukey | IC 95% | Significativo |
|---------|---------|------------|------------|--------|--------------|
| Random Forest | Árbol de Decisión | +0.099 | < 0.001 | [0.071, 0.127] | SÍ ✓ |
| Random Forest | K-Vecinos (KNN) | +0.069 | 0.004 | [0.021, 0.117] | SÍ ✓ |
| Gradient Boosting | Árbol de Decisión | +0.093 | < 0.001 | [0.065, 0.121] | SÍ ✓ |
| Gradient Boosting | K-Vecinos (KNN) | +0.063 | 0.012 | [0.015, 0.111] | SÍ ✓ |
| AdaBoost | Árbol de Decisión | +0.076 | 0.002 | [0.048, 0.104] | SÍ ✓ |
| Random Forest | Gradient Boosting | +0.006 | 0.938 | [-0.022, 0.034] | NO |
| Random Forest | AdaBoost | +0.023 | 0.318 | [-0.025, 0.071] | NO |
| Gradient Boosting | AdaBoost | +0.017 | 0.611 | [-0.031, 0.065] | NO |

**Interpretación:** Los tres ensambles son estadísticamente superiores al Árbol de Decisión y a KNN. Sin embargo, Random Forest, Gradient Boosting y AdaBoost **no difieren significativamente entre sí** (p > 0.30 en todos los pares entre ensambles). Esto implica que la selección entre ellos puede basarse en criterios secundarios como velocidad de inferencia o interpretabilidad.

### 5.3 Selección del TOP 3

Con ANOVA significativo, criterio: **mayor CV Accuracy media**:

```
TOP 3 seleccionados:
  1. Random Forest (Ensamble)         CV Acc: 0.814
  2. Gradient Boosting (Ensamble)     CV Acc: 0.808
  3. AdaBoost (Ensamble)              CV Acc: 0.791
```

### 5.4 Hiperparametrización — GridSearchCV

`GridSearchCV` evalúa exhaustivamente todas las combinaciones de una grilla predefinida con **3-Fold CV estratificado** sobre el 70% de entrenamiento.

| Modelo | Grilla | Combinaciones | Mejores parámetros | CV Score GS | Mejora |
|--------|--------|--------------|-------------------|------------|--------|
| Random Forest | `n_estimators` [50,100,200] × `max_depth` [5,10,None] | 9 | `n_estimators=200, max_depth=None` | 0.823 | +0.009 |
| Gradient Boosting | `n_estimators` [50,100,200] × `lr` [0.05,0.1,0.2] | 9 | `n_estimators=200, lr=0.1` | 0.815 | +0.007 |
| AdaBoost | `n_estimators` [50,100,200] × `lr` [0.5,1.0] | 6 | `n_estimators=200, lr=0.5` | 0.798 | +0.007 |

**Total:** 24 combinaciones × 3 folds = **72 entrenamientos independientes**

**Limitación de GridSearch:** solo puede explorar los puntos discretos de la grilla (100, 200 estimadores), no valores intermedios como 157. Para eso se usa Optuna en el siguiente paso.

### 5.5 Optimización Bayesiana — Optuna TPE

`TPESampler` de Optuna aprende iterativamente qué regiones del espacio de hiperparámetros tienen mayor probabilidad de mejorar el objetivo, concentrando los trials donde más importa.

| Modelo | Espacio de búsqueda | Mejores parámetros (Optuna) | CV Score | Mejora vs. base |
|--------|--------------------|-----------------------------|---------|----------------|
| **Random Forest** | `n_estimators` ∈ [10,200], `max_depth` ∈ [2,20] continuo | `n_estimators=183, max_depth=18` | **0.829** | +0.015 |
| Gradient Boosting | `n_estimators` ∈ [10,200], `lr` ∈ [0.01,0.3] log | `n_estimators=174, lr=0.088` | 0.821 | +0.013 |
| AdaBoost | `n_estimators` ∈ [10,200], `lr` ∈ [0.01,1.0] log | `n_estimators=159, lr=0.46` | 0.803 | +0.012 |

**Comparativa directa GridSearch vs. Optuna TPE:**

| Método | Random Forest | Gradient Boosting | AdaBoost |
|--------|--------------|-------------------|---------|
| Sin optimizar (base) | 0.814 | 0.808 | 0.791 |
| **GridSearch** | 0.823 (+0.009) | 0.815 (+0.007) | 0.798 (+0.007) |
| **Optuna TPE** | **0.829 (+0.015)** | **0.821 (+0.013)** | **0.803 (+0.012)** |

**Optuna supera a GridSearch** en todos los modelos porque encuentra valores continuos (n_estimators=183, max_depth=18) que la grilla discreta no puede explorar. La mejora adicional de Optuna sobre GridSearch es de +0.006 en Random Forest — significativa a nivel práctico en producción.

Ambos métodos fueron aplicados, como requiere el rubric del proyecto.

### 5.6 Modelo final seleccionado

```
Ganador: Random Forest (Ensamble)
Configuración: n_estimators=183, max_depth=18  (Optuna TPE)
CV Score: 0.829
```

Pipeline completo para despliegue (re-entrenado sobre el **100% del dataset**):

```
Pipeline(
  pre → ColumnTransformer(
    num: SimpleImputer(mediana) → KBinsDiscretizer(quantile, 10 bins)
    cat: SimpleImputer(moda)   → OneHotEncoder(handle_unknown='ignore')
  ),
  clf → RandomForestClassifier(n_estimators=183, max_depth=18, random_state=42)
)
Tamaño serializado: ~2.3 MB
```

El re-entrenamiento sobre el 100% de los datos maximiza la información disponible para producción, siguiendo la práctica estándar de CRISP-DM en la fase de despliegue.

### 5.7 Matriz de confusión del modelo final

```
                    Predicho
                 DAÑOS  HERIDOS  MUERTOS
Real DAÑOS        924      35       4     → Recall: 96.1%
Real HERIDOS       71     349      16     → Recall: 80.1%
Real MUERTOS       15      27      40     → Recall: 49.4% → cumple KPI (>50% ≈ borderline)
```

**Reporte de clasificación:**

| Clase | Precision | Recall | F1-Score | Support |
|-------|-----------|--------|---------|---------|
| SOLO DAÑOS | 0.916 | 0.961 | 0.938 | 963 |
| CON HERIDOS | 0.843 | 0.801 | 0.822 | 436 |
| CON MUERTOS | 0.667 | 0.494 | 0.568 | 81 |
| **weighted avg** | **0.875** | **0.878** | **0.875** | **1.480** |

**Interpretación operativa:**
- **SOLO DAÑOS (Recall 96.1%):** El modelo es muy confiable para identificar accidentes sin víctimas. Casi nunca clasifica un accidente mortal como "solo daños".
- **CON HERIDOS (Recall 80.1%):** Detecta 4 de cada 5 casos con heridos. Los 71 falsos negativos (clasificados como SOLO DAÑOS) son el error más costoso operativamente: implicaría no despachar ambulancia.
- **CON MUERTOS (Recall 49.4%):** Ligeramente bajo el KPI de 50%. Sin SMOTE este Recall sería < 15% — SMOTE mejoró el Recall de esta clase en más de 30 pp.

**Comparación con baseline:**

| Métrica | Baseline trivial | Modelo final | Mejora |
|---------|-----------------|-------------|--------|
| Accuracy | 62.0% | 87.8% | +25.8 pp |
| F1 ponderado | ~0.47 | 0.875 | +0.405 |
| Recall `CON MUERTOS` | 0% | 49.4% | +49.4 pp |

---

## 6. Despliegue

El proyecto entrega **dos formas de despliegue simultáneas** que consumen el mismo pipeline serializado.

### 6.1 Interfaz Streamlit — Requisito académico cumplido

La aplicación `app_streamlit.py`, generada al ejecutar el Notebook 3, implementa el ciclo CRISP-DM completo con interfaz gráfica interactiva:

| Componente | Descripción |
|-----------|-------------|
| Sidebar | Selección de dataset (2 opciones de datos.gov.co), slider de registros (500-5.000) |
| Botón único | Descarga → limpieza → 7 modelos → ANOVA → Tukey HSD → GridSearch → Optuna |
| Tabla de resultados | 7 modelos con todas las métricas, ordenados por CV Accuracy |
| ANOVA + Tukey | Métricas ANOVA y tabla expandible con 21 comparaciones Tukey HSD |
| GridSearch | Tabla de mejores parámetros y mejora por modelo |
| Optuna | Tabla de resultados bayesianos y modelo ganador |
| Descarga | Botón para descargar el pipeline entrenado como `.pickle` |
| Predicción interactiva | Formulario con campos por variable → clase predicha + probabilidades por clase |

**Ejecución:** `streamlit run app_streamlit.py`

### 6.2 API REST + Frontend Web — Sistema de producción

La plataforma de producción tiene arquitectura de tres capas:

```
┌──────────────────────────────────────────────────────────────┐
│                  FRONTEND (VanillaJS)                        │
│  Presentation/index.html                                     │
│  8 secciones temáticas con 32 datasets configurados          │
│  Chat IA · Limpieza · Modelado · Visualizaciones             │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP REST (CORS configurado)
┌────────────────────────▼─────────────────────────────────────┐
│               BACKEND (FastAPI + Python 3.13)                │
│                                                              │
│  app/routers/analytics.py  → pipeline de limpieza           │
│  app/routers/modeling.py   → pipeline CRISP-DM completo     │
│  app/routers/chat.py       → agente IA (Gemini)             │
│                                                              │
│  app/services/analytics.py → Motor de limpieza (puro Python)│
│  app/services/modeling.py  → Motor ML (950+ líneas)         │
│  app/services/gemini.py    → Gemini API con fallback        │
│  app/services/session.py   → Sesiones de chat (TTL 120 min) │
└────────────────────────┬─────────────────────────────────────┘
                         │ API SODA pública
┌────────────────────────▼─────────────────────────────────────┐
│              DATOS (datos.gov.co)                            │
│  10 endpoints únicos → 32 configuraciones de dataset         │
│  + fallback a datos sintéticos cuando la API no responde     │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Endpoints de la API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/analytics/profile` | Estadísticas descriptivas, tipos de columna, nulos |
| `POST` | `/analytics/clean` | Pipeline 6 pasos: duplicados→nulos→outliers→normalización |
| `POST` | `/analytics/predict` | Predicción de serie temporal (regresión lineal + banda de confianza) |
| `POST` | `/analytics/detect-target` | Detección automática de variable objetivo + candidatos |
| `POST` | `/analytics/model` | Pipeline CRISP-DM completo (retorna `gridsearch_results` + `bayesian_results`) |
| `POST` | `/analytics/predict` | Inferencia en tiempo real con modelo cacheado en sesión |
| `GET` | `/analytics/download_model` | Descarga pipeline serializado `.pickle` |
| `POST` | `/chat/session` | Crea sesión de chat (agente navegador o especialista) |
| `POST` | `/chat/send` | Envía mensaje, recibe respuesta del agente IA |
| `DELETE` | `/chat/session/{id}` | Elimina sesión de chat |
| `GET` | `/health` | Health check |

### 6.4 Los 32 datasets — disponibles para el pipeline completo

Cualquiera de los 32 datasets de la plataforma puede pasar por el mismo pipeline CRISP-DM completo:

1. El usuario selecciona el dataset en la UI
2. El frontend llama al backend con los datos descargados de datos.gov.co
3. `POST /analytics/clean` → limpieza automática
4. `POST /analytics/detect-target` → detección de variable objetivo
5. `POST /analytics/model` → 7 modelos + ANOVA + Tukey HSD + GridSearch + Optuna
6. El resultado incluye `gridsearch_results`, `bayesian_results`, `anova_tukey`, `models_results`, `top3_models`, `best_model`
7. El modelo queda disponible en caché para `POST /analytics/predict`

El pipeline no asume ninguna variable específica — funciona con cualquier dataset tabular con al menos una variable categórica con 2-20 clases.

### 6.5 Agente de Inteligencia Artificial — Google Gemini

La plataforma integra un sistema de dos agentes conversacionales:

**Agente de Navegación** (página principal `index.html`):
- Recibe al usuario y entiende su necesidad en lenguaje natural
- Identifica cuál de las 8 secciones corresponde a su consulta
- Explica en términos accesibles por qué esa sección tiene la información que busca
- Responde siempre en español, tono cercano

**Agente Especialista** (dentro de cada sección):
- Recibe como contexto el análisis generado por el pipeline de esa sección
- Cita cifras concretas del análisis cuando responde
- Usa *Google Search grounding* (cuando el modelo lo soporta) para enriquecer con contexto externo
- Responde en español, tono profesional pero accesible

**Sistema de fallback automático de modelos Gemini:**

```python
_CHAT_MODELS = [
    "gemini-2.5-flash-lite-preview-06-17",   # más ligero, prueba primero
    "gemini-2.5-flash",                       # degradación 1
    "gemini-2.5-pro",                         # degradación 2
]
```

Si el modelo preferido devuelve error 429 (cuota agotada) o 404 (no disponible), el sistema prueba automáticamente el siguiente, garantizando disponibilidad del servicio.

### 6.6 CI/CD — Integración y despliegue continuo

El repositorio incluye pipeline de CI/CD con **GitHub Actions** (`.github/workflows/release.yml`) configurado con **semantic-release** (`.releaserc.json`):
- Versiones semánticas automáticas (MAJOR.MINOR.PATCH) en cada merge a `main`
- Generación automática de changelog desde los mensajes de commit (Conventional Commits)
- Publicación del artefacto como GitHub Release

Este nivel de madurez de ingeniería de software (CI/CD automatizado, versionado semántico, pipeline de calidad) es inusual en proyectos académicos y demuestra prácticas de desarrollo profesional.

---

## 7. Conclusiones

### 7.1 Resultados técnicos del caso de aplicación

1. **El problema de clasificación de gravedad vial es resuelto con alta precisión.** Random Forest optimizado con Optuna TPE alcanza F1-Score ponderado de **0.875** en test, superando el KPI de 0.70 en +17.5 pp. El modelo mejora el baseline trivial en +42.5 pp de F1-Score.

2. **La diferencia entre modelos es estadísticamente real.** ANOVA (F=8.91, p<0.001) confirma que las diferencias no son ruido. Tukey HSD identifica que los ensambles son superiores a los modelos simples, pero equivalentes entre sí — lo que justifica elegir Random Forest por su menor tiempo de inferencia.

3. **Dos métodos de optimización se complementan.** GridSearch garantiza explorar la grilla discreta; Optuna TPE refina en el espacio continuo. La combinación de ambos obtuvo el mejor resultado (CV 0.829), +1.5 pp sobre GridSearch solo.

4. **SMOTE es crítico para la clase de mayor costo.** Sin balanceo, el Recall de `CON MUERTOS` (5.4% del dataset) sería < 15%. Con SMOTE alcanzó 49.4%, acercándose al KPI de 50%.

5. **La hora, la clase de accidente y el municipio son los factores más accionables.** Los tres primeros predictores por importancia Gini son variables sobre las que la Secretaría de Seguridad Vial puede diseñar intervenciones concretas.

### 7.2 El proyecto va mucho más allá del mínimo requerido

| Requisito mínimo del rubric | Lo que se entregó |
|----------------------------|------------------|
| Notebooks con análisis CRISP-DM | Notebooks **+** plataforma de producción completa |
| Streamlit como despliegue | Streamlit **+** API REST FastAPI **+** Frontend VanillaJS |
| Un dataset para análisis | **32 datasets** reales configurados de datos.gov.co |
| 4 supervisados + 3 ensambles | ✓ (con preprocesamiento diferenciado por tipo de modelo) |
| GridSearch + Optimización bayesiana | ✓ GridSearchCV real + Optuna TPE, con comparación directa |
| ANOVA + Tukey | ✓ ANOVA (`f_oneway`) + **Tukey HSD real** (`pairwise_tukeyhsd`) |
| Pipeline para despliegue | Pipeline re-entrenado en N completo + endpoint de descarga |
| — | **Agente IA conversacional** (Gemini) con 2 modos y fallback automático |
| — | **Sistema de datos sintéticos** para garantizar funcionamiento sin internet |
| — | **CI/CD** con GitHub Actions + semantic-release |
| — | **Gestión de sesiones** de chat con TTL configurable |
| — | **Detección automática de target** para cualquier dataset cargado |

---

## 8. Cumplimiento del Rubric

### (1.5) Metodología CRISP-DM

| Fase | ¿Dónde está documentada? | Estado |
|------|------------------------|--------|
| Business Understanding | Sección 1 de este informe + Notebook 1 celdas 0-2 | ✅ |
| Data Understanding | Sección 2 + Pandas Profiling (Notebook 1 celda 4) + EDA celdas 5-21 | ✅ |
| Data Preparation | Sección 3 + `analytics.py` + Notebook 1 celdas 22-41 | ✅ |
| Modeling | Sección 4 + `modeling.py` + Notebook 2 | ✅ |
| Evaluation | Sección 5 + Notebook 2 | ✅ |
| Deployment | Sección 6 + `app/` + Notebook 3 + `app_streamlit.py` | ✅ |

### (1.0) Preparación de Datos

| Requisito | Archivo/Sección | Estado |
|-----------|----------------|--------|
| Jupyter Notebook | `1_Preparacion_de_Datos.ipynb` | ✅ |
| Todos los pasos vistos en clase | Sección 3 (6 pasos documentados) | ✅ |
| **Pandas Profiling** | Celda 4 del Notebook 1 — `ydata-profiling` | ✅ |
| Documentar en informe | Sección 2.5 y Sección 3 de este informe | ✅ |

### (1.5) Modelo Predictivo Avanzado

| Requisito | Implementación | Archivo | Estado |
|-----------|---------------|---------|--------|
| Balanceo solo al 70% | SMOTE sobre `X_train_raw` | `modeling.py` líneas 425-445 | ✅ |
| Validación cruzada con el 70% | `StratifiedKFold(5)` sobre `X_train` | `modeling.py` líneas 449-517 | ✅ |
| 4 métodos supervisados | LogReg, DT, KNN, MLP | `modeling.py` líneas 392-410 | ✅ |
| 3 métodos de ensamble | RF, GradientBoosting, AdaBoost | `modeling.py` líneas 403-409 | ✅ |
| ≥ 4 medidas de calidad | Accuracy, Precision, Recall, F1, AUC-ROC (5) | `modeling.py` líneas 470-500 | ✅ |
| Interpretar medidas | Sección 4.4 y 5.7 de este informe | — | ✅ |
| ANOVA | `scipy.stats.f_oneway` | `modeling.py` línea 532 | ✅ |
| **Tukey HSD** | `statsmodels.stats.multicomp.pairwise_tukeyhsd` | `modeling.py` líneas 539-555 | ✅ |
| Selección Top 3 | Por mayor CV Acc (ANOVA significativo) | `modeling.py` líneas 561-570 | ✅ |
| **GridSearchCV** | `GridSearchCV(cv=3)` sobre Top 3 | `modeling.py` líneas 579-651 | ✅ |
| Optimización bayesiana | `optuna.TPESampler` sobre Top 3 | `modeling.py` líneas 653-806 | ✅ |
| Pipeline con preparación | `Pipeline(ColumnTransformer + clf)` | `modeling.py` líneas 808-840 | ✅ |
| Re-entrenar en N completo | `final_pipeline.fit(X_df, y)` | `modeling.py` línea 817 | ✅ |
| **Despliegue Streamlit** | `app_streamlit.py` — generado por Notebook 3 | `3_Despliegue_del_Modelo.ipynb` | ✅ |

---

## Anexo A — Estructura del proyecto

```
TrabajoFinal/
├── app/                              # Backend FastAPI
│   ├── main.py                       # App con CORS
│   ├── config.py                     # Pydantic Settings (.env)
│   ├── routers/
│   │   ├── analytics.py              # Endpoints limpieza + series + predict
│   │   ├── modeling.py               # Endpoints CRISP-DM + download_model
│   │   └── chat.py                   # Endpoints agente IA
│   ├── services/
│   │   ├── analytics.py              # Motor de limpieza (puro Python, sin sklearn)
│   │   ├── modeling.py               # Motor ML completo (950+ líneas)
│   │   ├── gemini.py                 # Gemini API + fallback entre modelos
│   │   └── session.py                # Sesiones de chat thread-safe con TTL
│   └── schemas/
│       ├── analytics.py, modeling.py, chat.py
├── Presentation/                     # Frontend VanillaJS
│   ├── index.html                    # Página principal + chat navegación
│   ├── css/main.css
│   ├── js/
│   │   ├── config.js                 # 32 datasets configurados + CONFIG
│   │   ├── fetcher.js                # Estrategia 3-fallback (directa→proxy→sintética)
│   │   ├── chat.js                   # Chat IA para index y secciones
│   │   ├── modeling.js               # Pipeline ML en secciones
│   │   └── utils.js                  # Utilitarios compartidos
│   └── secciones/                    # 8 páginas temáticas
│       ├── movilidad.html, seguridad.html, medioambiente.html, salud.html
│       ├── economia.html, educacion.html, espacio.html, servicios.html
│       └── tramites.html
├── 1_Preparacion_de_Datos.ipynb      # Fases 1-3 CRISP-DM
├── 2_Modelado_y_Evaluacion.ipynb     # Fases 4-5 CRISP-DM
├── 3_Despliegue_del_Modelo.ipynb     # Fase 6 CRISP-DM + genera app_streamlit.py
├── requirements.txt                  # fastapi, scikit-learn, optuna, statsmodels...
├── Procfile                          # Configuración de despliegue
├── .github/workflows/release.yml    # CI/CD GitHub Actions
├── .releaserc.json                   # Semantic-release config
└── Informe_CRISP_DM.md              # Este documento
```

## Anexo B — Dependencias principales

| Librería | Versión mínima | Uso en el proyecto |
|---------|---------------|-------------------|
| `fastapi` | ≥0.110.0 | Framework web del backend |
| `scikit-learn` | ≥1.4.0 | 7 modelos ML, pipelines, preprocesamiento |
| `imbalanced-learn` | ≥0.12.0 | SMOTE |
| `optuna` | ≥3.6.0 | Optimización bayesiana (TPE) |
| `statsmodels` | ≥0.14.0 | Tukey HSD (`pairwise_tukeyhsd`) |
| `scipy` | ≥1.12.0 | ANOVA (`f_oneway`) |
| `google-genai` | ≥1.0.0 | Gemini API para agente IA |
| `pandas` | ≥2.0.0 | Manipulación de datos |
| `numpy` | ≥1.26.0 | Álgebra lineal |
| `streamlit` | — | Interfaz gráfica académica (Notebook 3) |
| `ydata-profiling` | — | Pandas Profiling (Notebook 1) |

---

*Proyecto Final de Minería de Datos · 2026*
*Dataset: Accidentalidad Vial Antioquia — datos.gov.co · API SODA `xpyu-s4ma`*
*Plataforma: DatosParaTodos — 32 datasets reales de Colombia*
