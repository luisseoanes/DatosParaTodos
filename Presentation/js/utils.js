// ============================================================
//  DatosParaTodos — Utilidades compartidas
//  Fetching, limpieza, visualización y Gemini (Medellín 5.0)
// ============================================================

// ── FETCH ──────────────────────────────────────────────────
async function fetchDataset(dataset, limit = 500) {
    if (!dataset) {
        return { ok: false, data: [], total: 0, error: 'Dataset no definido', synthetic: true };
    }

    let lastError = null;
    let triedCsv = false;
    let triedUrl = null;

    // Pre-resolve when possible to avoid 404/403 noise
    if (!dataset.csvUrl && !dataset._resolved) {
        await resolveDatasetAccess(dataset);
    }

    // Normalize any csvUrl to https if possible
    if (dataset.csvUrl) dataset.csvUrl = normalizeUrl(dataset.csvUrl);

    // Prefer CSV if explicitly provided (federated datasets)
    if (dataset.csvUrl) {
        triedCsv = true;
        try {
            return await fetchCsvDataset(dataset.csvUrl, limit);
        } catch (e) {
            lastError = e;
        }
    }

    // Try Socrata endpoint (tabular datasets)
    const baseUrl = dataset.endpoint || (dataset.resourceId ? `${CONFIG.datosGovBase}/${dataset.resourceId}.json` : '');
    if (baseUrl) {
        const url = withAppToken(withLimit(baseUrl, limit));
        triedUrl = url;
        try {
            return await fetchSocrataDataset(url);
        } catch (e) {
            lastError = e;
        }
    }

    // Attempt resolution for missing/non-tabular datasets
    if (shouldResolveDataset(lastError)) {
        await resolveDatasetAccess(dataset);

        if (!triedCsv && dataset.csvUrl) {
            try {
                return await fetchCsvDataset(dataset.csvUrl, limit);
            } catch (e) {
                lastError = e;
            }
        }

        const resolvedUrl = dataset.endpoint || (dataset.resourceId ? `${CONFIG.datosGovBase}/${dataset.resourceId}.json` : '');
        if (resolvedUrl && resolvedUrl !== triedUrl) {
            const url = withAppToken(withLimit(resolvedUrl, limit));
            try {
                return await fetchSocrataDataset(url);
            } catch (e) {
                lastError = e;
            }
        }
    }

    console.error(`[DPT] Error en fetch:`, lastError);
    // Fallback: generar datos sinteticos si el proxy o la API fallan
    return {
        ok: false,
        data: generateFallback(dataset, Math.min(limit, 300)),
        error: lastError?.message || 'Error de red',
        synthetic: true,
    };
}

function withLimit(url, limit) {
    if (!url) return url;
    if (!/\$limit=/.test(url)) {
        url += (url.includes('?') ? '&' : '?') + `$limit=${limit}`;
    }
    return url;
}

function withAppToken(url) {
    if (!url || !CONFIG?.appToken) return url;
    if (url.includes('$$app_token=')) return url;
    return url + (url.includes('?') ? '&' : '?') + `$$app_token=${encodeURIComponent(CONFIG.appToken)}`;
}

function normalizeUrl(url) {
    if (!url) return url;
    return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

function proxyUrl(url) {
    if (!CONFIG?.corsProxy) return url;
    return `${CONFIG.corsProxy}${encodeURIComponent(url)}`;
}

function makeFetchError(status, body) {
    const msg = typeof body === 'string' ? body : JSON.stringify(body);
    const err = new Error(`HTTP ${status}: ${msg}`.slice(0, 220));
    err.status = status;
    err.body = body;
    return err;
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { return null; }
}

function shouldResolveDataset(err) {
    if (!err) return true;
    const msg = (err.message || '').toLowerCase();
    return msg.includes('non-tabular') || msg.includes('dataset.missing') || msg.includes('not found') || msg.includes('404') || msg.includes('403');
}

async function fetchSocrataDataset(url) {
    const finalUrl = proxyUrl(url);
    console.log(`[DPT] Fetching: ${url}`);

    const res = await fetch(finalUrl, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
        const errText = await res.text();
        const parsed = safeJsonParse(errText);
        throw makeFetchError(res.status, parsed?.message || errText);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
        if (data?.error) throw makeFetchError(res.status || 500, data?.message || 'Error API Socrata');
        return { ok: true, data: [data], total: 1, synthetic: false, source: 'api' };
    }

    return { ok: true, data, total: data.length, synthetic: false, source: 'api' };
}

async function fetchCsvDataset(csvUrl, limit) {
    const finalUrl = proxyUrl(normalizeUrl(csvUrl));
    console.log(`[DPT] Fetching CSV: ${csvUrl}`);

    const res = await fetch(finalUrl);
    if (!res.ok) {
        const errText = await res.text();
        throw makeFetchError(res.status, errText);
    }

    const text = await res.text();
    const data = parseCsv(text, limit);
    if (!data || data.length === 0) {
        throw new Error('CSV vacio o sin filas');
    }
    return { ok: true, data, total: data.length, synthetic: false, source: 'csv' };
}

function parseCsv(text, limit = 1000) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];

    const headers = splitCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        if (rows.length >= limit) break;
        const cols = splitCsvLine(lines[i]);
        if (cols.length === 1 && cols[0] === '') continue;
        const row = {};
        headers.forEach((h, idx) => {
            const v = cols[idx] !== undefined ? cols[idx] : '';
            row[h] = v === '' ? null : v;
        });
        rows.push(row);
    }
    return rows;
}

function splitCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out;
}

async function resolveDatasetAccess(dataset) {
    if (!dataset || dataset._resolved) return dataset;
    dataset._resolved = true;
    // dataset._missing removed to avoid skipping valid endpoints

    // If already has csvUrl/jsonUrl, nothing to resolve
    if (dataset.csvUrl || dataset.jsonUrl) {
        if (dataset.csvUrl) dataset.csvUrl = normalizeUrl(dataset.csvUrl);
        if (dataset.jsonUrl) dataset.jsonUrl = normalizeUrl(dataset.jsonUrl);
        return dataset;
    }

    let resolved = false;

    // Try metadata by portal URL (if present)
    if (dataset.portalUrl) {
        const maybeId = extractViewIdFromUrl(dataset.portalUrl);
        if (maybeId && maybeId !== dataset.resourceId) {
            const view = await fetchViewMeta(maybeId);
            if (view) {
                applyViewMeta(dataset, view);
                if (dataset.csvUrl || dataset.resourceId) {
                    resolved = true;
                    return dataset;
                }
            }
        }
    }

    // Try metadata by current resourceId
    if (dataset.resourceId) {
        const view = await fetchViewMeta(dataset.resourceId);
        if (view) {
            applyViewMeta(dataset, view);
            if (dataset.csvUrl || dataset.resourceId) {
                resolved = true;
                return dataset;
            }
        }
    }

    // Search by title
    if (dataset.title) {
        const best = await searchBestView(dataset.title, dataset.tags || []);
        if (best) {
            const view = await fetchViewMeta(best.id);
            if (view) {
                applyViewMeta(dataset, view);
                if (dataset.csvUrl || dataset.resourceId) resolved = true;
            }
        }
    }

    // Try local medata catalog as last resort
    if (!resolved) {
        const cat = await findInMedataCatalog(dataset);
        if (cat?.csvUrl) {
            dataset.csvUrl = normalizeUrl(cat.csvUrl);
            resolved = true;
        }
    }

    return dataset;
}

async function fetchViewMeta(id) {
    try {
        const res = await fetch(`https://www.datos.gov.co/api/views/${id}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function applyViewMeta(dataset, view) {
    if (!view) return;
    const assetType = view.assetType;
    const viewType = view.viewType;

    if (assetType === 'dataset' || viewType === 'tabular') {
        dataset.resourceId = view.id;
        dataset.endpoint = `https://www.datos.gov.co/resource/${view.id}.json`;
        return;
    }

    if (assetType === 'federated_href' || viewType === 'href') {
        const meta = view.metadata || {};
        const direct = meta.accessPoints?.['text/csv'];
        const fromAdditional = Array.isArray(meta.additionalAccessPoints)
            ? meta.additionalAccessPoints.map(a => a?.urls?.['text/csv']).find(Boolean)
            : null;
        dataset.csvUrl = normalizeUrl(direct || fromAdditional || '');
    }
}

async function searchBestView(query, tags = []) {
    try {
        const variants = buildQueryVariants(query, tags);
        let best = null;
        let bestScore = 0;

        for (const q of variants) {
            const url = `https://www.datos.gov.co/api/search/views?q=${encodeURIComponent(q)}`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const results = data?.results || [];

            for (const item of results) {
                const view = item?.view;
                if (!view) continue;
                const assetType = view.assetType;
                if (assetType !== 'dataset' && assetType !== 'federated_href') continue;
                const score = scoreMatch(q, view.name || '');
                if (score > bestScore) {
                    bestScore = score;
                    best = view;
                }
            }
        }
        return bestScore >= 0.08 ? best : null;
    } catch {
        return null;
    }
}

function scoreMatch(a, b) {
    const na = normalizeText(a);
    const nb = normalizeText(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1.2;
    const tokensA = na.split(' ').filter(Boolean);
    const tokensB = nb.split(' ').filter(Boolean);
    let inter = 0;

    for (const ta of tokensA) {
        if (tokensB.includes(ta)) {
            inter += 1;
            continue;
        }
        if (tokensB.some(tb => tb.startsWith(ta) || ta.startsWith(tb))) {
            inter += 0.6;
        }
    }

    const denom = tokensA.length + tokensB.length;
    const dice = denom ? (2 * inter) / denom : 0;
    const substring = nb.includes(na) || na.includes(nb) ? 0.2 : 0;
    return dice + substring;
}

function normalizeText(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildQueryVariants(title, tags = []) {
    const base = String(title || '').trim();
    if (!base) return [];
    const parts = base.split(/[—–-]/).map(p => p.trim()).filter(Boolean);
    const first = parts[0] || base;
    const tokens = first.split(/\s+/).slice(0, 4).join(' ');
    const variants = [base];
    if (first !== base) variants.push(first);
    if (tokens && tokens !== first) variants.push(tokens);
    if (Array.isArray(tags)) {
        const tagQuery = tags.slice(0, 3).join(' ');
        if (tagQuery) variants.push(tagQuery);
    }
    return [...new Set(variants)];
}

function extractViewIdFromUrl(url) {
    try {
        const m = String(url).match(/\/([a-z0-9]{4}-[a-z0-9]{4})(?:\/?$|\\?|#)/i);
        return m ? m[1] : null;
    } catch {
        return null;
    }
}

let _medataCatalog = null;
async function loadMedataCatalog() {
    if (_medataCatalog) return _medataCatalog;
    try {
        const res = await fetch('/data/tmp_medata_catalog.json');
        if (!res.ok) return null;
        const json = await res.json();
        _medataCatalog = json?.dataset || [];
        return _medataCatalog;
    } catch {
        return null;
    }
}

async function findInMedataCatalog(dataset) {
    const catalog = await loadMedataCatalog();
    if (!catalog || !Array.isArray(catalog)) return null;

    const query = [dataset.title, dataset.description, ...(dataset.tags || [])].filter(Boolean).join(' ');
    const queryNorm = normalizeText(query);

    let best = null;
    let bestScore = 0;

    for (const d of catalog) {
        const title = d?.title || '';
        const desc = d?.description || '';
        const keywords = Array.isArray(d?.keyword) ? d.keyword.join(' ') : '';
        const cand = `${title} ${desc} ${keywords}`;
        const score = scoreMatch(queryNorm, normalizeText(cand));
        if (score > bestScore) {
            const csvUrl = extractCsvUrl(d);
            if (!csvUrl) continue;
            bestScore = score;
            best = { csvUrl, title };
        }
    }

    return bestScore >= 0.08 ? best : null;
}

function extractCsvUrl(d) {
    const dist = Array.isArray(d?.distribution) ? d.distribution : [];
    for (const di of dist) {
        const fmt = (di?.format || '').toLowerCase();
        const mt = (di?.mediaType || '').toLowerCase();
        if (fmt === 'csv' || mt === 'text/csv') {
            return di?.downloadURL || di?.accessURL || '';
        }
    }
    return '';
}

function generateFallback(dataset, n) {
    const rows = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
        const row = {};
        // Columnas numéricas del config
        (dataset.numericCols || ['valor', 'cantidad']).forEach(col => {
            const base = Math.random() * 5000;
            row[col] = +(base + (Math.random() < 0.05 ? -base * 1.2 : 0)).toFixed(2);
            if (Math.random() < 0.05) row[col] = null;
        });
        // Columnas de fecha
        (dataset.dateCols || ['fecha']).forEach(col => {
            const d = new Date(now);
            d.setDate(d.getDate() - Math.floor(Math.random() * 730)); // últimos 2 años
            row[col] = Math.random() < 0.04 ? null : d.toISOString().split('T')[0];
        });
        // Columnas categóricas
        (dataset.categoryCols || ['comuna', 'clase']).forEach((col, ci) => {
            const options = [
                ['Poblado', 'Laureles', 'Belén', 'Aranjuez', 'Castilla', 'Doce de Octubre', 'Robledo', 'Villa Hermosa', 'Buenos Aires', 'La Candelaria'],
                ['Tipo A', 'Tipo B', 'Tipo C'],
                ['Bajo', 'Medio', 'Alto'],
                ['Urbano', 'Rural'],
                ['Medellín', 'Bello', 'Itagüí', 'Envigado']
            ];
            const pool = options[ci % options.length];
            row[col] = Math.random() < 0.05 ? null : pool[Math.floor(Math.random() * pool.length)];
        });
        // Duplicados ~3%
        if (i > 0 && Math.random() < 0.03) rows.push({ ...rows[Math.floor(Math.random() * i)] });
        else rows.push(row);
    }
    return rows;
}

// ── CLEANING PIPELINE ─────────────────────────────────────
function detectColumns(data) {
    if (!data || data.length === 0) return { numeric: [], date: [], categorical: [], all: [], cat: [] };
    const sample = data.slice(0, Math.min(60, data.length));
    const all = Object.keys(data[0] || {});
    const numeric = [], date = [], categorical = [];
    
    all.forEach(col => {
        const vals = sample.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
        if (vals.length === 0) { categorical.push(col); return; }
        
        const numVals = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v));
        const dateVals = vals.filter(v => typeof v === 'string' && v.length >= 10 && !isNaN(Date.parse(v)));
        
        if (numVals.length > vals.length * 0.7) numeric.push(col);
        else if (dateVals.length > vals.length * 0.5) date.push(col);
        else categorical.push(col);
    });
    
    // Alias 'cat' y 'categorical' para compatibilidad total
    return { numeric, date, categorical, cat: categorical, all };
}

function analyzeData(data) {
    if (!data || data.length === 0) return { cols: detectColumns([]), stats: {}, rowCount: 0 };
    const cols = detectColumns(data);
    const stats = {};
    const n = data.length;
    
    cols.all.forEach(col => {
        const vals = data.map(r => r[col]);
        const cleanVals = vals.filter(v => v !== null && v !== undefined && v !== '');
        const nulls = n - cleanVals.length;
        const isNum = cols.numeric.includes(col);
        
        stats[col] = {
            type: isNum ? 'numeric' : (cols.date.includes(col) ? 'date' : 'categorical'),
            total: n,
            nullCount: nulls,
            nullPct: +((nulls / n) * 100).toFixed(1),
            uniqueCount: new Set(cleanVals).size
        };
        
        if (isNum) {
            const nums = cleanVals.map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (nums.length) {
                stats[col].mean = +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
                stats[col].min = Math.min(...nums);
                stats[col].max = Math.max(...nums);
                const sorted = [...nums].sort((a,b) => a-b);
                stats[col].median = sorted[Math.floor(sorted.length/2)];
            }
        }
    });
    return { cols, stats, rowCount: n };
}

async function runCleaningPipeline(rawData, dataset, onStep) {
    const issues = [];
    let data = rawData.map(r => ({ ...r }));
    const cols = detectColumns(data);

    const steps = [
        {
            id: 'audit', label: 'Auditoría inicial', icon: '🔍',
            fn: async (d) => {
                let nullTotal = 0;
                cols.all.forEach(col => {
                    nullTotal += d.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length;
                });
                return { data: d, msg: `${d.length.toLocaleString()} registros · ${cols.all.length} columnas · ${nullTotal} celdas vacías` };
            },
        },
        {
            id: 'duplicates', label: 'Eliminar duplicados', icon: '🗑️',
            fn: async (d) => {
                const seen = new Set();
                let removed = 0;
                const cleaned = d.filter(row => {
                    const key = JSON.stringify(row);
                    if (seen.has(key)) { removed++; issues.push({ tipo: 'Duplicado', campo: 'toda la fila', original: 'Fila repetida', accion: 'Eliminada' }); return false; }
                    seen.add(key); return true;
                });
                return { data: cleaned, msg: `${removed} filas duplicadas eliminadas` };
            },
        },
        {
            id: 'nulls', label: 'Completar valores vacíos', icon: '✏️',
            fn: async (d) => {
                let filled = 0;
                const cleaned = d.map(row => {
                    const r = { ...row };
                    cols.numeric.forEach(col => {
                        if (r[col] === null || r[col] === undefined || r[col] === '') {
                            const vals = d.map(x => parseFloat(x[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
                            r[col] = vals.length ? vals[Math.floor(vals.length / 2)] : 0;
                            filled++;
                            issues.push({ tipo: 'Valor vacío', campo: col, original: 'NULL', accion: `Mediana: ${r[col]}` });
                        }
                    });
                    cols.categorical.forEach(col => {
                        if (r[col] === null || r[col] === undefined || r[col] === '') {
                            r[col] = 'No especificado';
                            filled++;
                            issues.push({ tipo: 'Valor vacío', campo: col, original: 'NULL', accion: '"No especificado"' });
                        }
                    });
                    return r;
                });
                return { data: cleaned, msg: `${filled} valores vacíos completados` };
            },
        },
        {
            id: 'outliers', label: 'Corregir valores extremos', icon: '📐',
            fn: async (d) => {
                let fixed = 0;
                let cleaned = d.map(r => ({ ...r }));
                cols.numeric.forEach(col => {
                    const vals = d.map(r => parseFloat(r[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
                    if (vals.length < 4) return;
                    const q1 = vals[Math.floor(vals.length * 0.25)];
                    const q3 = vals[Math.floor(vals.length * 0.75)];
                    const iqr = q3 - q1;
                    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
                    cleaned = cleaned.map(row => {
                        const v = parseFloat(row[col]);
                        if (!isNaN(v) && (v < lo || v > hi)) {
                            const c = +(v < lo ? lo : hi).toFixed(2);
                            issues.push({ tipo: 'Outlier', campo: col, original: v, accion: `Corregido a ${c}` });
                            fixed++;
                            return { ...row, [col]: c };
                        }
                        return row;
                    });
                });
                return { data: cleaned, msg: `${fixed} valores extremos corregidos (IQR)` };
            },
        },
        {
            id: 'types', label: 'Normalizar tipos y formatos', icon: '🔤',
            fn: async (d) => {
                let normalized = 0;
                const cleaned = d.map(row => {
                    const r = { ...row };
                    cols.numeric.forEach(col => { 
                        if (typeof r[col] === 'string' && r[col].trim() !== '') { 
                            const val = parseFloat(r[col].replace(',', '.'));
                            if (!isNaN(val)) { r[col] = val; normalized++; }
                        } 
                    });
                    cols.categorical.forEach(col => { if (typeof r[col] === 'string') { const t = r[col].trim(); if (t !== r[col]) normalized++; r[col] = t; } });
                    return r;
                });
                return { data: cleaned, msg: `${normalized} valores normalizados` };
            },
        },
        {
            id: 'score', label: 'Calcular puntuación de calidad', icon: '✅',
            fn: async (d) => {
                const totalCells = d.length * cols.all.length;
                let remaining = 0;
                cols.all.forEach(col => { remaining += d.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length; });
                const completeness = Math.max(0, 100 - (remaining / totalCells * 100));
                const uniqueness = Math.min(100, (new Set(d.map(r => JSON.stringify(r))).size / d.length) * 100);
                const score = Math.round(completeness * 0.6 + uniqueness * 0.4);
                return { data: d, msg: `Puntuación de calidad: ${score}/100`, score };
            },
        },
    ];

    let current = data;
    let finalScore = 0;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (onStep) onStep(i, 'running', step.label);
        await sleep(400);
        const result = await step.fn(current);
        current = result.data;
        if (result.score !== undefined) finalScore = result.score;
        if (onStep) onStep(i, 'done', step.label, result.msg);
    }
    return { cleanData: current, issues, score: finalScore, steps: steps.length };
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
        return `- ${col}: ${s.uniqueCount} valores únicos (tipo: ${s.type})`;
    }).join('\n');

    return `Eres un analista de datos experto en políticas públicas de Medellín y Colombia. Analiza el siguiente dataset y genera conclusiones claras para ciudadanos.

**Dataset:** ${dataset.title}
**Fuente:** ${dataset.source}
**Sección:** ${section}
**Total registros (limpios):** ${cleanData.length.toLocaleString()}

**Resumen de columnas:**
${colSummary}

**Muestra de datos (5 filas):**
${JSON.stringify(numSample, null, 2)}

**Contexto del ciudadano:** ${userContext || 'Interesado en entender su ciudad a través de datos'}

Genera un análisis con EXACTAMENTE esta estructura (usa ## para títulos):

## ¿Qué nos dicen estos datos?
(2-3 párrafos explicando los hallazgos más importantes en lenguaje sencillo)

## Hallazgos clave
(4-5 puntos concretos con cifras reales sacadas del dataset)

## Tendencias identificadas
(2-3 patrones notables)

## Recomendaciones
(3-4 acciones para ciudadanos o gobierno)

## Limitaciones
(1-2 puntos sobre qué no capturan estos datos)

Responde en español. No inventes cifras.`;
}

// ── CHARTS ───────────────────────────────────────────────
let chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) { 
        if (typeof chartInstances[id].destroy === 'function') chartInstances[id].destroy(); 
        delete chartInstances[id]; 
    }
}

// Aliases para compatibilidad con nombres cortos
const killChart = destroyChart;
const CI = chartInstances;

function createBarChart(canvasId, labels, datasets, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 11 }, color: '#374151' } }, ...options.plugins },
            scales: {
                x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
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
            plugins: { legend: { labels: { font: { size: 11 }, color: '#374151' } } },
            scales: {
                x: { ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
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
        data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'right', labels: { font: { size: 10 }, color: '#374151', padding: 10 } } },
        },
    });
}

function createScatterChart(canvasId, points, xLabel, yLabel) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [{ label: `${xLabel} vs ${yLabel}`, data: points, backgroundColor: 'rgba(26,86,219,0.5)', pointRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: xLabel, color: '#6b7280', font: {size: 10} }, ticks: { color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { title: { display: true, text: yLabel, color: '#6b7280', font: {size: 10} }, ticks: { color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.04)' } },
            },
        },
    });
}

// ── PREDICTION ───────────────────────────────────────────
function simplePrediction(values, steps = 10) {
    const n = values.length;
    if (n < 4) return { predictions: [], confidence: [], slope: 0, direction: 'estable', residStd: 0 };
    
    // Linear regression
    const xs = Array.from({ length: n }, (_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((acc, x, i) => acc + (x - xMean) * (values[i] - yMean), 0);
    const den = xs.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    
    // Residual std for confidence band
    const residuals = values.map((v, i) => v - (slope * i + intercept));
    const residStd = Math.sqrt(residuals.map(r => r * r).reduce((a, b) => a + b, 0) / n);
    
    // Predictions
    const predictions = Array.from({ length: steps }, (_, i) => {
        const x = n + i;
        const trend = slope * x + intercept;
        const seasonal = Math.sin(i * 0.5) * residStd * 0.1;
        return +(trend + seasonal).toFixed(2);
    });
    
    const confidence = predictions.map(p => ({ low: +(p - residStd).toFixed(2), high: +(p + residStd).toFixed(2) }));
    
    return { 
        predictions, 
        confidence, 
        slope, 
        intercept, 
        residStd, 
        direction: slope > 0.01 ? 'alza' : slope < -0.01 ? 'baja' : 'estable' 
    };
}

// Aliases para compatibilidad
const predict = simplePrediction;

// ── UTILS ────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Number.isInteger(n) ? n.toLocaleString('es-CO') : n.toFixed(2);
}

// Alias corto
const fmt = formatNumber;

function renderMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
        .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)(?=\n(?!<li>)|\n*$)/g, '<ul>$1</ul>')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/^(?!<[hul\/]|<p|<\/p)(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '').replace(/<p>(<[hul])/g, '$1').replace(/(<\/[hul][^>]*>)<\/p>/g, '$1');
}

// Alias
const md2html = renderMarkdown;

function showToast(msg, type = 'info') {
    let container = document.getElementById('_toasts');
    if (!container) {
        container = document.createElement('div');
        container.id = '_toasts';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
        document.body.appendChild(container);
    }
    const colors = { info: '#1a56db', success: '#057a55', warning: '#b45309', error: '#9f1239' };
    const t = document.createElement('div');
    t.style.cssText = `background:#1f2937;color:#f9fafb;padding:11px 16px;border-radius:10px;font-size:13px;border-left:4px solid ${colors[type]};min-width:230px;max-width:340px;box-shadow:0 8px 24px rgba(0,0,0,0.25);animation:tIn .25s ease;font-family:'DM Sans',sans-serif;pointer-events:all`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.animation = 'tOut .22s ease forwards'; setTimeout(() => t.remove(), 240); }, 3800);
}

// Alias
const toast = showToast;

// ── AUTO-VISUALIZATION from cleaned data ────────────────
function autoVisualize(cleanData, analysis, sectionTitle) {
    const { cols } = analysis;
    if (!cols || cleanData.length === 0) return;
    
    const sectionColor = document.documentElement.style.getPropertyValue('--section-color') || '#1a56db';

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
            backgroundColor: sectionColor + 'cc', borderRadius: 5,
        }]);
    }

    // Chart 2: Line — historic + prediction
    if (cols.numeric.length >= 1) {
        const numCol = cols.numeric[0];
        const vals = cleanData.map(r => parseFloat(r[numCol])).filter(v => !isNaN(v)).slice(0, 80);
        const pred = simplePrediction(vals, 15);
        const lHist = vals.slice(-40).map((_, i) => `#${i + 1}`);
        const lPred = pred.predictions.map((_, i) => `P${i + 1}`);
        
        createLineChart('chart-line', [...lHist, ...lPred], [
            { label: 'Histórico', data: [...vals.slice(-40), ...new Array(15).fill(null)], borderColor: sectionColor, backgroundColor: sectionColor + '10', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
            { label: 'Predicción', data: [...new Array(Math.min(40, vals.length)).fill(null), ...pred.predictions], borderColor: '#b45309', borderDash: [6, 3], fill: false, tension: 0.4, pointRadius: 3, borderWidth: 2 },
        ]);
    }

    // Chart 3: Donut — distribution
    if (cols.categorical.length > 0) {
        const catCol = cols.categorical.length > 1 ? cols.categorical[1] : cols.categorical[0];
        const counts = {};
        cleanData.forEach(r => {
            const k = String(r[catCol] || 'N/A').slice(0, 20);
            counts[k] = (counts[k] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const pal = ['#1a56db', '#057a55', '#9f1239', '#b45309', '#5850ec', '#0694a2', '#374151', '#be185d'];
        createDonutChart('chart-donut', sorted.map(x => x[0]), sorted.map(x => x[1]), pal.slice(0, sorted.length));
    }

    // Chart 4: Scatter
    if (cols.numeric.length >= 2) {
        const xCol = cols.numeric[0], yCol = cols.numeric[1];
        const pts = cleanData.slice(0, 150).map(r => ({ x: parseFloat(r[xCol]), y: parseFloat(r[yCol]) })).filter(p => !isNaN(p.x) && !isNaN(p.y));
        createScatterChart('chart-scatter', pts, xCol, yCol);
    }
}
