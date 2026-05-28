# DatosParaTodos — Plataforma de Datos Abiertos con IA y Machine Learning

**DatosParaTodos** es una plataforma web completa de ciencia de datos que toma datasets públicos del gobierno colombiano (datos.gov.co), los analiza estadísticamente, entrena modelos de Machine Learning y permite hacer predicciones en tiempo real, todo con asistencia de inteligencia artificial (Google Gemini). Fue construida como proyecto final de Minería de Datos siguiendo la metodología CRISP-DM de principio a fin.

---

## Tabla de Contenidos

1. [Qué hace la plataforma](#qué-hace-la-plataforma)
2. [Arquitectura general](#arquitectura-general)
3. [Cómo está organizado el código](#cómo-está-organizado-el-código)
4. [El Backend (FastAPI)](#el-backend-fastapi)
5. [El Frontend (HTML/JS puro)](#el-frontend-htmljs-puro)
6. [Los 32 datasets y las 8 secciones](#los-32-datasets-y-las-8-secciones)
7. [El pipeline de Machine Learning (CRISP-DM)](#el-pipeline-de-machine-learning-crisp-dm)
8. [Los agentes de Inteligencia Artificial](#los-agentes-de-inteligencia-artificial)
9. [Cómo correrlo localmente](#cómo-correrlo-localmente)
10. [Despliegue en producción (Railway)](#despliegue-en-producción-railway)
11. [Variables de entorno](#variables-de-entorno)
12. [Flujo completo de un usuario](#flujo-completo-de-un-usuario)

---

## Qué hace la plataforma

Un usuario entra a la plataforma y puede:

1. **Hablar con un asistente de IA** que lo orienta según su necesidad (ej: "quiero entender la accidentalidad vial en Medellín").
2. **Explorar 8 categorías temáticas** (Movilidad, Salud, Economía, etc.), cada una con 4 datasets reales del gobierno.
3. **Cargar un dataset** y ver automáticamente estadísticas: promedio, mediana, distribución, valores nulos, gráficas de barras e histogramas.
4. **Entrenar 7 modelos de Machine Learning** con un solo clic: el sistema limpia los datos, balancea las clases, entrena y compara los modelos.
5. **Ver los resultados estadísticos** de la comparación (ANOVA, Tukey HSD, GridSearchCV, Optuna).
6. **Hacer predicciones nuevas** con un formulario interactivo usando el mejor modelo encontrado.
7. **Descargar el modelo entrenado** como archivo `.pickle` para usar externamente.
8. **Chatear con un especialista de IA** que conoce el análisis que se acaba de hacer.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO (Navegador)                   │
│                HTML + CSS + JavaScript Vanilla               │
│           Chart.js para gráficas, Gemini API directa        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (fetch API)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI / Python)                 │
│                                                             │
│  /analytics  ─── Estadísticas descriptivas de columnas      │
│  /analytics/detect-target ─── Detecta variable objetivo     │
│  /analytics/model ─── Pipeline ML completo (CRISP-DM)       │
│  /analytics/predict ─── Predicción con modelo en caché      │
│  /analytics/download_model ─── Descarga modelo .pickle      │
│  /chat/session ─── Crea sesión con agente Gemini            │
│  /chat/message ─── Envía mensaje al agente                  │
│  /chat/business-understanding ─── Análisis fase 1 CRISP-DM  │
│  /health ─── Estado del servidor                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    Google Gemini    sklearn / scipy    datos.gov.co
     (via google-     (ML + Stats)    (datasets reales)
        genai)
```

El backend también **sirve el frontend estático**: cuando se accede a la raíz `/`, FastAPI devuelve los archivos HTML de la carpeta `Presentation/`.

---

## Cómo está organizado el código

```
proyecto/
│
├── app/                          ← Backend Python (FastAPI)
│   ├── main.py                   ← Punto de entrada, monta routers y sirve frontend
│   ├── config.py                 ← Lee variables de entorno (.env)
│   ├── routers/
│   │   ├── analytics.py          ← Endpoints de estadísticas y ML
│   │   ├── chat.py               ← Endpoints del chat con Gemini
│   │   └── modeling.py           ← Endpoints del pipeline CRISP-DM
│   ├── services/
│   │   ├── analytics.py          ← Lógica de estadísticas descriptivas
│   │   ├── modeling.py           ← Pipeline completo de ML (~950 líneas, corazón del sistema)
│   │   ├── gemini.py             ← Comunicación con Google Gemini API
│   │   └── session.py            ← Gestión de sesiones de chat con TTL
│   └── schemas/
│       ├── analytics.py          ← Modelos Pydantic para respuestas de estadísticas
│       ├── modeling.py           ← Modelos Pydantic para request/response de ML
│       └── chat.py               ← Modelos Pydantic para el chat
│
├── Presentation/                 ← Frontend (HTML/CSS/JS puro, sin frameworks)
│   ├── index.html                ← Página principal con el chat de navegación
│   ├── css/main.css              ← Estilos globales (dark theme, glassmorphism)
│   ├── js/
│   │   ├── config.js             ← Configuración: URL del backend, secciones disponibles
│   │   ├── utils.js              ← Funciones reutilizables: llamadas a Gemini, formateo
│   │   ├── fetcher.js            ← Carga de datos desde datos.gov.co (3 estrategias)
│   │   ├── chat.js               ← Componente de chat flotante (todas las páginas)
│   │   └── modeling.js           ← Renderizado de resultados ML (gráficas, tablas)
│   └── secciones/
│       ├── movilidad.html        ← Sección Movilidad (4 datasets)
│       ├── salud.html            ← Sección Salud
│       ├── economia.html         ← Sección Economía
│       ├── educacion.html        ← Sección Educación
│       ├── seguridad.html        ← Sección Seguridad
│       ├── medioambiente.html    ← Sección Medio Ambiente
│       ├── servicios.html        ← Sección Servicios Públicos
│       ├── espacio.html          ← Sección Espacio Público
│       └── tramites.html         ← Sección Trámites y Gobierno
│
├── 2_Modelado_y_Evaluacion.ipynb ← Notebook académico con el mismo pipeline
├── 3_Despliegue_del_Modelo.ipynb ← Notebook de despliegue con Streamlit
├── Informe_CRISP_DM.md           ← Informe académico completo (CRISP-DM)
├── requirements.txt              ← Dependencias Python
├── nixpacks.toml                 ← Configuración de build para Railway
├── .python-version               ← Versión de Python (3.13)
├── .env.example                  ← Plantilla de variables de entorno
└── .github/workflows/release.yml ← CI/CD con semantic-release
```

---

## El Backend (FastAPI)

### `app/main.py` — El servidor

Es el punto de entrada. Hace tres cosas:
1. Crea la app FastAPI.
2. Registra los tres grupos de rutas (analytics, chat, modeling).
3. Al final, monta la carpeta `Presentation/` como archivos estáticos en la raíz `/`. Esto significa que el mismo servidor Python sirve tanto la API como el HTML del usuario.

### `app/config.py` — Configuración

Lee las variables de entorno usando `pydantic-settings`. Si existe un archivo `.env`, lo carga automáticamente. Las variables importantes son `GEMINI_API_KEY`, `GEMINI_MODEL` y `SESSION_TTL_MINUTES`.

### `app/services/analytics.py` — Estadísticas descriptivas

Cuando el frontend carga un dataset, llama a este servicio. Recibe una lista de filas (JSON) y devuelve:
- **Detección automática de tipo de columna**: numérica, fecha o categórica. Usa heurísticas inteligentes: si una columna tiene solo enteros del 1 al 6 (como "estrato"), la trata como categórica en vez de numérica.
- **Estadísticas por columna**: para numéricas calcula media, mediana, desviación estándar, mínimo, máximo, percentiles, conteo de nulos. Para categóricas calcula frecuencias de los valores más comunes.

### `app/services/session.py` — Sesiones de chat

Guarda el historial de conversación de cada usuario en memoria (diccionario Python). Cada sesión tiene un TTL (tiempo de vida) configurable (por defecto 120 minutos). Pasado ese tiempo, la sesión se borra automáticamente para liberar memoria. Cada sesión tiene un UUID único.

### `app/services/gemini.py` — Inteligencia Artificial

Maneja toda la comunicación con Google Gemini. Tiene tres funcionalidades:

1. **Agente de navegación**: Se presenta en la página de inicio y orienta al usuario hacia la sección correcta según su necesidad. Tiene acceso a Google Search para respuestas actualizadas.

2. **Agente especialista**: Se activa en cada sección temática. Conoce los resultados del análisis que el usuario acaba de hacer (estadísticas, conclusiones) y puede responder preguntas contextualizadas. Por ejemplo: "¿En qué barrio hay más accidentes?" usando los datos reales del dataset cargado.

3. **Business Understanding**: Dado el nombre y columnas de un dataset, genera automáticamente la fase 1 de CRISP-DM: pregunta analítica principal, objetivo del análisis, KPIs sugeridos y columna objetivo para clasificación.

El servicio tiene **degradación automática de modelos**: si el modelo principal (configurado en `.env`) alcanza el límite de cuota (error 429), automáticamente prueba con `gemini-2.5-flash`, luego con `gemini-2.5-pro`.

### `app/services/modeling.py` — Pipeline completo de ML

Este es el archivo más importante del sistema (~950 líneas). Implementa la metodología CRISP-DM completa. Ver la sección [El pipeline de Machine Learning](#el-pipeline-de-machine-learning-crisp-dm) para el detalle.

---

## El Frontend (HTML/JS puro)

El frontend no usa React, Vue ni ningún framework. Es HTML + CSS + JavaScript vanilla. Esto lo hace más liviano y fácil de desplegar como archivos estáticos.

### `Presentation/js/config.js` — Configuración del frontend

Define la URL base del backend (autodetectada según si es localhost o producción) y la lista de las 8 secciones temáticas con sus nombres y rutas.

### `Presentation/js/fetcher.js` — Carga de datos

Es el componente más complejo del frontend. Para cada dataset intenta 3 estrategias en orden:

1. **Llamada directa a la API de datos.gov.co (Socrata)**: `https://www.datos.gov.co/resource/{id}.json?$limit=5000`
2. **Proxy CORS** (`https://corsproxy.io/?url=...`): si la llamada directa falla por restricciones del navegador.
3. **Datos sintéticos realistas**: Si las dos anteriores fallan, genera automáticamente 400 registros ficticios pero coherentes con la estructura esperada del dataset (por ejemplo, para accidentalidad vial genera datos con columnas como barrio, tipo de accidente, gravedad, etc. con valores típicos de Medellín).

Después de cargar, `sanitizeRows()` limpia los metadatos internos de Socrata (columnas que empiezan con `:`) para que no contaminen el análisis.

### `Presentation/js/modeling.js` — Visualización de resultados ML

Renderiza toda la interfaz de resultados del pipeline de Machine Learning:
- **Fases CRISP-DM**: tarjetas con el estado de cada fase (integración, limpieza, correlaciones, etc.).
- **Tabla de 7 modelos**: accuracy, precision, recall, F1, AUC-ROC para cada clasificador.
- **Gráfica de barras** (Chart.js) comparando accuracy de los 7 modelos.
- **Gráfica radar** comparando las 5 métricas del top 3.
- **Resultados ANOVA y Tukey HSD**: tabla de comparaciones múltiples entre modelos.
- **GridSearchCV**: tarjetas con los mejores hiperparámetros encontrados para cada modelo del top 3.
- **Mejor modelo**: detalle del pipeline (pasos de preprocesamiento + clasificador).
- **Formulario de predicción interactiva**: generado dinámicamente. Para columnas con pocos valores únicos muestra un `<select>`, para numéricas muestra un `<input number>`.

### `Presentation/js/utils.js` — Utilidades

Funciones reutilizables en todo el frontend:
- `callGemini(apiKey, prompt)`: llama directamente a Gemini API desde el navegador (el usuario provee su propia API key en la UI).
- `buildGeminiPrompt(dataset, cleanData, analysis, userContext, section)`: construye el prompt estructurado para análisis de un dataset, incluyendo estadísticas, contexto del dominio y contexto del usuario.

### `Presentation/js/chat.js` — Chat flotante

Componente de chat que aparece en todas las páginas como un botón flotante. Se conecta al backend (`/chat/session`, `/chat/message`) para mantener una conversación con el agente Gemini. En la página principal usa el agente de navegación; en las secciones usa el agente especialista con el contexto del análisis.

---

## Los 32 datasets y las 8 secciones

La plataforma tiene 8 secciones temáticas, cada una con 4 datasets reales de datos.gov.co:

| Sección | Datasets incluidos |
|---|---|
| **Movilidad** | Accidentalidad vial Antioquia, Accidentes tránsito Medellín, Infracciones de tránsito, Inventario vial |
| **Salud** | Casos EDA, Mortalidad materna, Vacunación por municipio, Enfermedades crónicas |
| **Economía** | Empresas registradas, Mercado laboral, Exportaciones, IPC por ciudad |
| **Educación** | Matrículas escolares, Deserción escolar, Pruebas Saber 11, Docentes por municipio |
| **Seguridad** | Homicidios, Hurtos, Violencia intrafamiliar, Extorsiones |
| **Medio Ambiente** | Calidad del aire, Residuos sólidos, Cuerpos de agua, Deforestación |
| **Servicios Públicos** | Cobertura acueducto, Cobertura energía, Alumbrado público, Gas natural |
| **Espacio Público** | Parques, Ciclovías, Espacio público efectivo, Equipamientos culturales |

Cada dataset es identificado por su ID de la API de Socrata (ej: `xpyu-s4ma` para Accidentalidad Vial Antioquia). El frontend usa esos IDs para llamar directamente a la API pública sin necesidad de descargar archivos.

---

## El pipeline de Machine Learning (CRISP-DM)

Todo ocurre en `app/services/modeling.py`, método `run_full_pipeline()`. Cuando el usuario hace clic en "Entrenar modelos", el frontend envía los datos y el backend ejecuta este flujo completo:

### Fase 1 — Integración de datos
Convierte la lista de JSON en un DataFrame de pandas. Detecta automáticamente cuál columna es la variable objetivo (target): busca la columna categórica con entre 2 y 20 valores únicos. Si no encuentra ninguna, devuelve error.

### Fase 2 — Eliminar variables irrelevantes
Elimina columnas con varianza cero (columnas constantes que tienen siempre el mismo valor y no aportan información).

### Fase 3 — Detección de tipos
Clasifica cada columna en numérica o categórica con heurísticas inteligentes: una columna de enteros del 1 al 6 es "estrato" (categórica), no un número continuo. Si más del 90% de los valores son convertibles a número y hay suficiente varianza, se trata como numérica.

### Fases 4 y 5 — Limpieza de nulos y atípicos
Configura imputadores:
- Columnas numéricas → imputación por **mediana** (robusta a outliers).
- Columnas categóricas → imputación por **moda** (valor más frecuente).

Los atípicos no se eliminan, se manejan mediante la robustez de los algoritmos y la imputación.

### Split 70/30
Antes de calcular correlaciones, se divide el dataset: 70% para entrenamiento, 30% para evaluación. Usa `stratify=y` para mantener la proporción de clases en ambas partes. Este orden es importante: calcular correlaciones sobre todo el dataset antes del split causaría *data leakage* (el test set influiría en las decisiones de preprocesamiento).

### Fases 6 y 7 — Análisis de correlaciones
Calcula la matriz de correlación de Pearson **solo sobre el 70% de entrenamiento**. Elimina columnas con correlación mayor a 0.90 (redundantes). Esto se aplica tanto a train como a test para mantener consistencia.

### Fase 8 — Balanceo con SMOTE
Si las clases están desbalanceadas (ej: 90% clase A, 10% clase B), aplica **SMOTE** (Synthetic Minority Oversampling Technique) **solo sobre el conjunto de entrenamiento**. SMOTE genera filas sintéticas de la clase minoritaria interpolando entre ejemplos reales. Nunca se aplica sobre el test set para no contaminar la evaluación.

### Fase 9 — Ingeniería de características
Se construyen dos tipos de pipelines de preprocesamiento, uno para cada familia de modelos:

**Para modelos lineales** (Logistic Regression, MLP):
- Numéricos: `SimpleImputer(mediana)` → `StandardScaler` → `PCA(95% varianza)`
- Categóricos: `SimpleImputer(moda)` → `OneHotEncoder`

**Para árboles** (Decision Tree, KNN, Random Forest, Gradient Boosting, AdaBoost):
- Numéricos: `SimpleImputer(mediana)` → `KBinsDiscretizer(5 bins, quantile)`
- Categóricos: `SimpleImputer(moda)` → `OneHotEncoder`

PCA reduce dimensionalidad manteniendo el 95% de la varianza explicada. KBinsDiscretizer convierte números continuos en categorías ordinales (los árboles suelen funcionar mejor así).

### Fase 10 — Entrenamiento de 7 modelos
Se entrenan simultáneamente:

| Tipo | Modelo |
|---|---|
| Supervisado | Regresión Logística |
| Supervisado | Árbol de Decisión |
| Supervisado | K-Vecinos más cercanos (KNN) |
| Supervisado | Red Neuronal (MLP) |
| Ensamble | Random Forest |
| Ensamble | Gradient Boosting |
| Ensamble | AdaBoost |

Cada uno usa su pipeline de preprocesamiento apropiado (lineal o árbol).

### Fase 11 — Validación cruzada
Para cada modelo se ejecuta **Stratified K-Fold Cross Validation** con `k = min(5, min_class_count)`. Si la clase más pequeña tiene solo 3 ejemplos, `k=3`. Esto evita que algún fold quede sin ejemplos de alguna clase. Se calculan accuracy, precision, recall y F1 en cada fold.

### Fase 12 — Evaluación final y métricas
Se evalúa cada modelo en el 30% de test. Se calculan: accuracy, precision, recall, F1 (macro), AUC-ROC (multiclass con OvR), y la matriz de confusión.

### Fase 13 — ANOVA y Tukey HSD
Con los scores de los folds de validación cruzada:
1. **ANOVA** (F-test de scipy): verifica si hay diferencias estadísticamente significativas entre los 7 modelos (H₀: todos tienen la misma media).
2. **Tukey HSD** (statsmodels): si ANOVA es significativo, hace comparaciones múltiples por pares para saber exactamente qué modelos son significativamente diferentes entre sí. Es más robusto que Bonferroni porque controla el error familiar (FWER) de forma más precisa.

### Fase 14 — GridSearchCV (Top 3 modelos)
Toma los 3 mejores modelos según accuracy y ejecuta **búsqueda exhaustiva de hiperparámetros**:
- Regresión Logística: prueba `C = [0.01, 0.1, 1.0, 10.0, 100.0]`
- Árbol: prueba combinaciones de `max_depth` y `min_samples_split`
- KNN: prueba `n_neighbors` y `weights`
- MLP: prueba `alpha` y `hidden_layer_sizes`
- Random Forest: prueba `n_estimators` y `max_depth`
- Gradient Boosting: prueba `n_estimators` y `learning_rate`
- AdaBoost: prueba `n_estimators` y `learning_rate`

Usa validación cruzada de 3 folds internos. Devuelve los mejores hiperparámetros y su score.

### Fase 15 — Optimización Bayesiana con Optuna
Para los mismos 3 mejores modelos, ejecuta **Optuna con TPE (Tree-structured Parzen Estimator)**. A diferencia de GridSearch que prueba todas las combinaciones posibles, Optuna aprende de los intentos anteriores para explorar el espacio de hiperparámetros de forma inteligente (más eficiente con espacios grandes). Ejecuta 30 trials por modelo.

### Resultado final — Mejor modelo y pipeline de despliegue
El modelo con mejor accuracy de validación cruzada se re-entrena sobre **todos los datos** (train + test) con sus mejores hiperparámetros encontrados por Optuna. El pipeline completo (preprocesamiento + modelo) se guarda en `model_cache["last"]` en memoria para poder hacer predicciones inmediatas. También se puede descargar como archivo `.pickle`.

---

## Los agentes de Inteligencia Artificial

La plataforma usa Google Gemini en dos contextos:

### Backend: Agentes de chat con sesiones
- **Agente de navegación** (`NAVIGATION_AGENT_PROMPT`): Activo en la página de inicio. Recibe el historial de conversación de la sesión y responde como orientador. Sabe cuáles son las 8 secciones y recomienda la correcta según la necesidad del usuario.
- **Agente especialista** (`SPECIALIST_AGENT_PROMPT`): Se instancia por sección. Recibe como contexto del sistema las conclusiones del análisis de datos (estadísticas calculadas, correlaciones encontradas, etc.). Puede responder preguntas específicas sobre esos datos.
- **Business Understanding**: Llamada sin sesión. Dado un dataset, genera la fase 1 de CRISP-DM en formato JSON estructurado.

Todos usan `google-genai` (SDK oficial de Google) con llamadas asíncronas para no bloquear el servidor.

### Frontend: Análisis directo con API key del usuario
En cada sección, el usuario puede ingresar su propia API key de Gemini en un campo de texto. El JavaScript llama directamente a la API de Gemini desde el navegador (sin pasar por el backend) para obtener análisis narrativos del dataset cargado. El prompt incluye las estadísticas calculadas, el contexto del dominio y la pregunta del usuario.

---

## Cómo correrlo localmente

### Requisitos previos
- Python 3.13
- Una API key de Google Gemini (gratis en [aistudio.google.com](https://aistudio.google.com))

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd <carpeta>

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env y agregar tu GEMINI_API_KEY

# 5. Iniciar el servidor
uvicorn app.main:app --reload --port 8000
```

Luego abrir `http://localhost:8000` en el navegador.

La documentación automática de la API está en `http://localhost:8000/docs`.

---

## Despliegue en producción (Railway)

El proyecto está configurado para desplegarse automáticamente en [Railway](https://railway.app):

- **`nixpacks.toml`**: Le dice a Railway cómo iniciar el servidor. Solo contiene el comando de inicio: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`. Railway auto-detecta Python y pip por presencia de `requirements.txt`.
- **`.python-version`**: Le dice a nixpacks que use Python 3.13.
- **`$PORT`**: Railway asigna el puerto dinámicamente mediante esta variable de entorno. El comando la lee automáticamente.
- **CI/CD**: `.github/workflows/release.yml` usa semantic-release para versionar automáticamente con tags siguiendo Conventional Commits.

Las variables de entorno (`GEMINI_API_KEY`, etc.) se configuran en el panel de Railway, no en el código.

---

## Variables de entorno

Copiar `.env.example` como `.env` y rellenar:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GEMINI_API_KEY` | API key de Google Gemini (obligatoria) | `AIzaSy...` |
| `GEMINI_MODEL` | Modelo de Gemini a usar | `gemini-2.5-flash-lite-preview-06-17` |
| `SESSION_TTL_MINUTES` | Tiempo de vida de sesiones de chat | `120` |

El archivo `.env` está en `.gitignore` y nunca debe subirse al repositorio.

---

## Flujo completo de un usuario

```
1. Usuario abre la plataforma
         │
         ▼
2. El agente de navegación (Gemini) lo saluda y pregunta qué necesita
         │
         ▼
3. Usuario dice "quiero entender los accidentes de tráfico"
         │
         ▼
4. Gemini recomienda la sección "Movilidad" y explica por qué
         │
         ▼
5. Usuario va a Movilidad → selecciona "Accidentalidad Vial Antioquia"
         │
         ▼
6. fetcher.js carga 5000 registros de datos.gov.co (o proxy, o sintéticos)
         │
         ▼
7. analytics.py calcula estadísticas → se muestran gráficas y tablas
         │
         ▼
8. Gemini genera Business Understanding: pregunta analítica, KPIs, target sugerido
         │
         ▼
9. Usuario hace clic en "Entrenar Modelos"
         │
         ▼
10. modeling.py ejecuta pipeline completo (~30 segundos):
    • Limpieza → Correlaciones → SMOTE → Ingeniería de características
    • Entrena 7 modelos → Validación cruzada → ANOVA → Tukey HSD
    • GridSearchCV → Optuna → Mejor modelo guardado en caché
         │
         ▼
11. modeling.js renderiza resultados:
    • Tabla de 7 modelos con métricas
    • Gráficas de barras y radar (Chart.js)
    • Tabla Tukey HSD de comparaciones
    • Tarjetas con mejores hiperparámetros (GridSearch)
    • Pipeline del mejor modelo
         │
         ▼
12. Usuario usa el formulario interactivo para hacer una predicción nueva
    (ej: "¿Qué tipo de accidente sería: barrio Poblado, lunes, 8pm, lluvioso?")
         │
         ▼
13. modeling_service.predict() devuelve clase predicha + probabilidades
         │
         ▼
14. Usuario puede descargar el modelo como mejor_modelo_crispdm.pickle
         │
         ▼
15. Usuario chatea con el agente especialista que conoce todos los resultados
```

---

## Tecnologías utilizadas

| Capa | Tecnología | Para qué |
|---|---|---|
| Backend | FastAPI 0.111 | API REST asíncrona |
| ML | scikit-learn 1.4+ | 7 clasificadores, Pipeline, GridSearchCV |
| ML | imbalanced-learn 0.12+ | SMOTE para balanceo |
| Estadística | scipy 1.12+ | ANOVA (f_oneway) |
| Estadística | statsmodels 0.14+ | Tukey HSD |
| Optimización | Optuna 3.6+ | Bayesian hyperparameter search |
| Datos | pandas 2.0+ | Manipulación de DataFrames |
| IA | google-genai 1.0+ | Gemini API (chat + Business Understanding) |
| Configuración | pydantic-settings 2.2 | Variables de entorno tipadas |
| Frontend | HTML/CSS/JS Vanilla | Sin frameworks, máxima portabilidad |
| Gráficas | Chart.js 4.4 | Barras, radar, histogramas |
| Despliegue | Railway + nixpacks | Hosting en la nube |
| CI/CD | GitHub Actions + semantic-release | Versionado automático |
