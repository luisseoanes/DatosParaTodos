// ============================================================
//  DatosParaTodos — Utilidades compartidas
//  Fetching, limpieza, visualización y Gemini
// ============================================================

// ── FETCH ──────────────────────────────────────────────────
async function fetchDataset(dataset, limit = 500) {
    const url = `${dataset.endpoint}?$limit=${limit}&$order=:id`;
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { ok: true, data, total: data.length };
    } catch (e) {
        // Fallback: generate synthetic data shaped like the real dataset
        return { ok: false, data: generateFallback(dataset, Math.min(limit, 300)), error: e.message, synthetic: true };
    }
}

function generateFallback(dataset, n) {
    const rows = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
        const row = {};
        // numeric cols
        (dataset.numericCols || []).forEach(col => {
            const base = Math.random() * 1000;
            row[col] = +(base + (Math.random() < 0.05 ? -base * 1.5 : 0)).toFixed(2);
            if (Math.random() < 0.06) row[col] = null;
        });
        // date cols
        (dataset.dateCols || []).forEach(col => {
            const d = new Date(now);
            d.setDate(d.getDate() - Math.floor(Math.random() * 365 * 2));
            row[col] = Math.random() < 0.04 ? null : d.toISOString().split('T')[0];
        });
        // category cols
        (dataset.categoryCols || []).forEach((col, ci) => {
            const options = [
                ['Bogotá', 'Antioquia', 'Valle del Cauca', 'Cundinamarca', 'Atlántico', 'Santander', 'Bolívar', 'Nariño'],
                ['Tipo A', 'Tipo B', 'Tipo C', 'Tipo D'],
                ['Bajo', 'Medio', 'Alto', 'Muy Alto'],
                ['Urbano', 'Rural', 'Centro Poblado'],
                ['Oficial', 'Privado', 'Contratado'],
            ];
            const pool = options[ci % options.length];
            row[col] = Math.random() < 0.05 ? null : pool[Math.floor(Math.random() * pool.length)];
        });
        // add a duplicate ~3% of the time
        if (i > 0 && Math.random() < 0.03) rows.push({ ...rows[Math.floor(Math.random() * i)] });
        else rows.push(row);
    }
    return rows;
}

const ANALYTICS_API_BASE = (typeof CONFIG !== 'undefined' && CONFIG.backendApiBase)
    ? CONFIG.backendApiBase
    : 'http://127.0.0.1:8000';

async function postAnalytics(path, payload) {
    const res = await fetch(`${ANALYTICS_API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Analytics API error ${res.status}`);
    return await res.json();
}

// ── ANALYTICS (Backend) ───────────────────────────────────
async function analyzeData(data) {
    if (!data || data.length === 0) return {};
    return await postAnalytics('/analytics/profile', { data });
}

async function runCleaningPipeline(rawData, dataset, onStep) {
    const stepLabels = [
        'Auditoría inicial',
        'Eliminar duplicados',
        'Completar valores vacíos',
        'Corregir valores extremos',
        'Normalizar tipos y formatos',
        'Calcular puntuación de calidad',
    ];

    stepLabels.forEach((label, i) => {
        if (onStep) onStep(i, 'running', label);
    });

    const result = await postAnalytics('/analytics/clean', { data: rawData });

    stepLabels.forEach((label, i) => {
        const msg = i === stepLabels.length - 1
            ? `Puntuación de calidad: ${result.score}/100`
            : 'Procesado en backend';
        if (onStep) onStep(i, 'done', label, msg);
    });

    return result;
}

// ── GEMINI ───────────────────────────────────────────────
async function callGemini(apiKey, prompt) {
    const url = `${CONFIG.geminiEndpoint}?key=${apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
        }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function buildGeminiPrompt(dataset, cleanData, analysis, userContext, section) {
    const numSample = cleanData.slice(0, 5);
    const colSummary = Object.entries(analysis.stats || {}).slice(0, 8).map(([col, s]) => {
        if (s.type === 'numeric') return `- ${col}: promedio=${s.mean}, min=${s.min}, max=${s.max}, nulos=${s.nullPct}%`;
        return `- ${col}: ${s.uniqueCount} valores únicos, tipo=${s.type}`;
    }).join('\n');

    return `Eres un analista de datos experto en Colombia. Analiza el siguiente dataset y genera conclusiones claras para ciudadanos colombianos.

**Dataset:** ${dataset.title}
**Fuente:** ${dataset.source}
**Sección:** ${section}
**Total registros (limpios):** ${cleanData.length.toLocaleString()}

**Resumen de columnas:**
${colSummary}

**Muestra de datos (5 filas):**
${JSON.stringify(numSample, null, 2)}

**Contexto del usuario:** ${userContext || 'Ciudadano colombiano interesado en datos públicos'}

Genera un análisis con EXACTAMENTE esta estructura (usa ## para títulos):

## ¿Qué nos dicen estos datos?
(2-3 párrafos explicando los hallazgos más importantes en lenguaje ciudadano, sin tecnicismos)

## Hallazgos clave
(4-5 puntos concretos con datos específicos del dataset)

## Tendencias identificadas
(2-3 tendencias o patrones notables)

## Recomendaciones
(3-4 acciones concretas que ciudadanos, empresas o el gobierno podrían tomar basadas en estos datos)

## Limitaciones de los datos
(1-2 puntos sobre qué no capturan estos datos o qué hay que tener en cuenta)

Responde en español. Sé específico con los números. No inventes datos que no estén en el resumen.`;
}

// ── CHARTS ───────────────────────────────────────────────
let chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function createBarChart(canvasId, labels, datasets, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 12 }, color: '#374151' } }, ...options.plugins },
            scales: {
                x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' }, ...options.xScale },
                y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' }, ...options.yScale },
            },
            ...options,
        },
    });
}

function createLineChart(canvasId, labels, datasets, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 12 }, color: '#374151' } } },
            scales: {
                x: { ticks: { color: '#6b7280', font: { size: 11 }, maxTicksLimit: 12 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
            },
            ...options,
        },
    });
}

function createDonutChart(canvasId, labels, data, colors) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 3 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: { legend: { position: 'right', labels: { font: { size: 11 }, color: '#374151', padding: 12 } } },
        },
    });
}

function createScatterChart(canvasId, points, xLabel, yLabel) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [{ label: `${xLabel} vs ${yLabel}`, data: points, backgroundColor: 'rgba(99,102,241,0.5)', pointRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: xLabel, color: '#6b7280' }, ticks: { color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                y: { title: { display: true, text: yLabel, color: '#6b7280' }, ticks: { color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)' } },
            },
        },
    });
}

// ── PREDICTION (Backend) ─────────────────────────────────
async function predictSeries(values, steps = 10) {
    return await postAnalytics('/analytics/predict', { values, steps });
}

// ── UTILS ────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Number.isInteger(n) ? n.toLocaleString('es-CO') : n.toFixed(2);
}

function renderMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/^## (.+)$/gm, '<h3 class="analysis-h3">$1</h3>')
        .replace(/^### (.+)$/gm, '<h4 class="analysis-h4">$1</h4>')
        .replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, (m) => `<ul>${m}</ul>`)
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul]|<\/[hul]|<p|<\/p)(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '');
}

function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none';
        document.body.appendChild(container);
    }
    const colors = { info: '#1a56db', success: '#057a55', warning: '#b45309', error: '#9f1239' };
    const t = document.createElement('div');
    t.style.cssText = `background:#1f2937;color:#f9fafb;padding:12px 18px;border-radius:10px;font-size:13px;border-left:4px solid ${colors[type]};min-width:240px;max-width:360px;box-shadow:0 8px 24px rgba(0,0,0,0.3);animation:toastIn .3s ease;font-family:'DM Sans',sans-serif;pointer-events:all`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut .25s ease forwards'; setTimeout(() => t.remove(), 300); }, 4000);
}

// Palette for charts
const PALETTE = ['#1a56db', '#057a55', '#9f1239', '#b45309', '#5850ec', '#0694a2', '#374151', '#be185d', '#0891b2', '#65a30d'];

// ── AUTO-VISUALIZATION from cleaned data ────────────────
function autoVisualize(cleanData, analysis, section) {
    const { cols, stats } = analysis;
    if (!cols || cleanData.length === 0) return;

    // Chart 1: Bar — top categorical by numeric
    if (cols.categorical.length > 0 && cols.numeric.length > 0) {
        const catCol = cols.categorical[0];
        const numCol = cols.numeric[0];
        const groups = {};
        cleanData.forEach(r => {
            const k = String(r[catCol] || 'N/A').slice(0, 20);
            if (!groups[k]) groups[k] = [];
            const v = parseFloat(r[numCol]);
            if (!isNaN(v)) groups[k].push(v);
        });
        const sorted = Object.entries(groups).map(([k, vs]) => ({ k, avg: vs.reduce((a, b) => a + b, 0) / vs.length })).sort((a, b) => b.avg - a.avg).slice(0, 10);
        createBarChart('chart-bar', sorted.map(x => x.k), [{
            label: numCol, data: sorted.map(x => +x.avg.toFixed(2)),
            backgroundColor: PALETTE.slice(0, sorted.length).map(c => c + 'cc'), borderRadius: 6,
        }]);
    }

    // Chart 2: Line — numeric trend or distribution
    if (cols.numeric.length >= 1) {
        const numCol = cols.numeric[0];
        const vals = cleanData.map(r => parseFloat(r[numCol])).filter(v => !isNaN(v)).slice(0, 60);
        const labels = vals.map((_, i) => `#${i + 1}`);
        createLineChart('chart-line', labels, [
            {
                label: 'Datos históricos',
                data: vals,
                borderColor: '#1a56db',
                backgroundColor: 'rgba(26,86,219,0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
        ]);
    }

    // Chart 3: Donut — category distribution
    if (cols.categorical.length > 0) {
        const catCol = cols.categorical.length > 1 ? cols.categorical[1] : cols.categorical[0];
        const counts = {};
        cleanData.forEach(r => {
            const k = String(r[catCol] || 'N/A').slice(0, 20);
            counts[k] = (counts[k] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        createDonutChart('chart-donut', sorted.map(x => x[0]), sorted.map(x => x[1]), PALETTE.slice(0, sorted.length));
    }

    // Chart 4: Scatter if 2+ numeric
    if (cols.numeric.length >= 2) {
        const xCol = cols.numeric[0], yCol = cols.numeric[1];
        const points = cleanData.slice(0, 200).map(r => ({ x: parseFloat(r[xCol]), y: parseFloat(r[yCol]) })).filter(p => !isNaN(p.x) && !isNaN(p.y));
        createScatterChart('chart-scatter', points, xCol, yCol);
    }
}