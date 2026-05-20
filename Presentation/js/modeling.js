// ============================================================
//  DatosParaTodos — Módulo de Modelado CRISP-DM
//  Pipeline completo: 4 supervisados + 3 ensamble + ANOVA/Tukey
//  + GridSearchCV + Pipeline final
// ============================================================

const MODELING_API = (typeof CONFIG !== 'undefined' && CONFIG.backendApiBase)
    ? CONFIG.backendApiBase : 'https://datosparatodos-production.up.railway.app';

// ── Estado global del modelado ──────────────────────────────
const MODELING_STATE = {
    targetCol: null,
    candidates: [],
    result: null,
    running: false,
};

// ── Detectar variable target ────────────────────────────────
async function detectTarget(data) {
    const res = await fetch(`${MODELING_API}/analytics/detect-target`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
}

// ── Ejecutar pipeline completo ──────────────────────────────
async function runModelingPipeline(data, targetCol) {
    const res = await fetch(`${MODELING_API}/analytics/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, target_col: targetCol }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
}

// ── Renderizar UI de selección de target ────────────────────
function renderTargetSelection(candidates, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!candidates || candidates.length === 0) {
        el.innerHTML = `<div class="alert alert-warn"><div class="alert-icon">⚠️</div><div>No se detectaron variables categóricas adecuadas para clasificación (se requieren entre 2 y 20 clases).</div></div>`;
        return;
    }
    MODELING_STATE.candidates = candidates;
    el.innerHTML = `
    <div style="margin-bottom:16px">
      <label style="font-size:13px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:8px">
        🎯 Variable objetivo (target) para clasificación
      </label>
      <select class="select-styled" id="targetSelect" style="width:100%;max-width:400px" onchange="onTargetChange()">
        ${candidates.map((c,i) => `<option value="${c.col}" ${i===0?'selected':''}>${c.col} (${c.n_classes} clases: ${c.classes.slice(0,3).join(', ')}${c.n_classes>3?'...':''})</option>`).join('')}
      </select>
    </div>
    <div id="targetPreview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${candidates[0].classes.map(c => `<span class="badge badge-blue">${c}</span>`).join('')}
    </div>
    <button class="btn btn-primary" id="btnRunModeling" onclick="startModelingPipeline()">
      🚀 Ejecutar Pipeline CRISP-DM Completo
    </button>`;
}

function onTargetChange() {
    const sel = document.getElementById('targetSelect');
    if (!sel) return;
    const c = MODELING_STATE.candidates.find(x => x.col === sel.value);
    if (c) {
        document.getElementById('targetPreview').innerHTML = c.classes.map(cl => `<span class="badge badge-blue">${cl}</span>`).join('');
    }
}

// ── Ejecutar pipeline y renderizar resultados ───────────────
async function startModelingPipeline() {
    const data = (typeof PAGE !== 'undefined') ? (PAGE.cleanData || PAGE.rawData) : null;
    if (!data) { showToast('⚠️ Primero carga y limpia los datos', 'warning'); return; }

    const targetCol = document.getElementById('targetSelect')?.value;
    if (!targetCol) { showToast('⚠️ Selecciona una variable objetivo', 'warning'); return; }

    MODELING_STATE.running = true;
    MODELING_STATE.targetCol = targetCol;

    const btn = document.getElementById('btnRunModeling');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Entrenando 7 modelos... (puede tomar 30-60s)'; }

    // Mostrar progreso
    const resultsEl = document.getElementById('modelingResults');
    if (resultsEl) {
        resultsEl.innerHTML = `
        <div class="loading-overlay" style="padding:48px">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <div style="font-size:15px;font-weight:600;color:var(--gray-700)">Ejecutando Pipeline CRISP-DM</div>
          <div style="font-size:13px;color:var(--gray-400);max-width:400px;text-align:center">
            Entrenando 4 modelos supervisados + 3 ensamble con validación cruzada,
            análisis ANOVA/Tukey y optimización GridSearchCV...
          </div>
        </div>`;
    }

    showToast('🔬 Iniciando pipeline de modelado CRISP-DM...', 'info');

    try {
        const result = await runModelingPipeline(data, targetCol);
        MODELING_STATE.result = result;

        if (result.error) {
            if (resultsEl) resultsEl.innerHTML = `<div class="alert alert-error"><div class="alert-icon">❌</div><div>${result.error}</div></div>`;
            showToast(`❌ ${result.error}`, 'error');
        } else {
            renderModelingResults(result);
            // Habilitar pestañas de Predicción e IA
            if (typeof enableTab === 'function') {
                enableTab(4);
                enableTab(5);
            }
            showToast('✅ Pipeline CRISP-DM completado — 7 modelos evaluados', 'success');
        }
    } catch (e) {
        if (resultsEl) resultsEl.innerHTML = `<div class="alert alert-error"><div class="alert-icon">❌</div><div>Error al ejecutar el pipeline: ${e.message}</div></div>`;
        showToast(`❌ Error: ${e.message}`, 'error');
    }

    MODELING_STATE.running = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '🚀 Re-ejecutar Pipeline CRISP-DM'; }
}

// ── Renderizar todos los resultados ─────────────────────────
function renderModelingResults(r) {
    const el = document.getElementById('modelingResults');
    if (!el) return;

    const sectionColor = (typeof section !== 'undefined') ? section.color : '#1a56db';

    el.innerHTML = `
    <!-- FASES CRISP-DM -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title">📋 Fases CRISP-DM Ejecutadas</div>
        <span class="badge badge-green">✓ ${r.phases?.length || 0} fases completadas</span>
      </div>
      <div class="card-body">
        <div class="pipeline" id="crispdmPipeline">
          ${(r.phases || []).map((p,i) => `
          <div class="pipe-step step-done">
            <div class="pipe-dot" style="border-color:#059669;background:#ecfdf5">✓</div>
            <div class="pipe-content">
              <div class="pipe-name">${p.name}</div>
              <div class="pipe-result ok">${p.detail}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- INFO DEL DATASET -->
    ${renderDataInfo(r)}

    <!-- RESULTADOS DE 7 MODELOS -->
    ${renderModelsComparison(r, sectionColor)}

    <!-- ANOVA + TUKEY -->
    ${renderAnovaTukey(r)}

    <!-- GRIDSEARCH -->
    ${renderGridSearch(r, sectionColor)}

    <!-- MODELO FINAL -->
    ${renderBestModel(r, sectionColor)}
    `;

    // Crear gráficos después de que el DOM esté listo
    setTimeout(() => {
        renderModelComparisonChart(r, sectionColor);
        renderRadarChart(r, sectionColor);
        renderInteractivePredictForm(r);
    }, 200);
}

// ── Predicción Interactiva ──────────────────────────────────
function renderInteractivePredictForm(r) {
    const container = document.getElementById('interactivePredictUI');
    if (!container) return;

    if (!r.pipeline_info || !r.pipeline_info.ready_for_deployment) {
        container.innerHTML = `<div class="alert alert-warn">No se pudo generar el formulario: el pipeline no está listo.</div>`;
        return;
    }

    let numCols = r.pipeline_info.num_cols || [];
    let catCols = r.pipeline_info.cat_cols || [];
    const targetCol = (r.target_info || {}).target || r.pipeline_info.target_col || null;

    // Fallback: inferir columnas directamente del dataset cuando pipeline_info no las trae
    if (numCols.length === 0 && catCols.length === 0) {
        const sampleData = (typeof PAGE !== 'undefined') ? (PAGE.cleanData || PAGE.rawData) : null;
        if (sampleData && sampleData.length > 0) {
            const sample = sampleData[0];
            Object.entries(sample).forEach(([col, val]) => {
                if (col === targetCol) return;
                const parsed = parseFloat(val);
                if (!isNaN(parsed) && val !== '' && val !== null) {
                    numCols.push(col);
                } else {
                    catCols.push(col);
                }
            });
        }
    }

    // Obtener un ejemplo representativo del dato para usar como placeholder
    const sampleRow = (() => {
        const d = (typeof PAGE !== 'undefined') ? (PAGE.cleanData || PAGE.rawData) : null;
        return (d && d.length > 0) ? d[0] : {};
    })();

    const allCols = [...numCols, ...catCols];

    if (allCols.length === 0) {
        container.innerHTML = `<div class="alert alert-warn">No se detectaron columnas de entrada. Asegúrate de haber ejecutado el pipeline completo.</div>`;
        return;
    }

    let html = `
    <p style="font-size:13px;color:var(--gray-600);margin-bottom:16px">
        Ingresa los valores para realizar una predicción personalizada usando el modelo <strong>${r.best_model?.name || 'entrenado'}</strong>.
        Los placeholders muestran un ejemplo real del dataset.
    </p>
    <form id="formPredict" onsubmit="event.preventDefault(); executeInteractivePrediction();">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:20px">
    `;

    // Campos numéricos
    numCols.forEach(col => {
        const example = sampleRow[col] !== undefined ? sampleRow[col] : '';
        html += `
        <div>
            <label style="font-size:11px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${col}">${col}</label>
            <input type="number" step="any" name="${col}" class="cw-input" style="width:100%;background:white;box-sizing:border-box" placeholder="${example !== '' ? example : '0.0'}">
        </div>`;
    });

    // Campos categóricos
    catCols.forEach(col => {
        const example = sampleRow[col] !== undefined ? sampleRow[col] : '';
        // Si el dataset tiene pocos valores únicos para esta columna, usar select
        const uniqueVals = (() => {
            const d = (typeof PAGE !== 'undefined') ? (PAGE.cleanData || PAGE.rawData) : null;
            if (!d) return [];
            const vals = [...new Set(d.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== ''))];
            return vals.length <= 15 ? vals : [];
        })();

        if (uniqueVals.length > 0) {
            html += `
            <div>
                <label style="font-size:11px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${col}">${col}</label>
                <select name="${col}" class="cw-input select-styled" style="width:100%;background:white;box-sizing:border-box">
                    <option value="">-- Seleccionar --</option>
                    ${uniqueVals.map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
            </div>`;
        } else {
            html += `
            <div>
                <label style="font-size:11px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${col}">${col}</label>
                <input type="text" name="${col}" class="cw-input" style="width:100%;background:white;box-sizing:border-box" placeholder="${example !== '' ? example : 'Valor...'}">
            </div>`;
        }
    });

    html += `
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;align-items:center;flex-wrap:wrap">
            <div id="predictResult" style="flex:1;min-width:200px"></div>
            <button type="button" class="btn btn-ghost" onclick="window.location.href='${MODELING_API}/analytics/download_model'">
                💾 Descargar Modelo (.pickle)
            </button>
            <button type="submit" class="btn btn-primary" id="btnPredictInteractive">
                🔮 Realizar Predicción
            </button>
        </div>
    </form>`;

    container.innerHTML = html;
}

async function executeInteractivePrediction() {
    const form = document.getElementById('formPredict');
    const btn = document.getElementById('btnPredictInteractive');
    const resultEl = document.getElementById('predictResult');
    if (!form || !btn) return;

    const formData = new FormData(form);
    const input_data = {};
    formData.forEach((v, k) => {
        // Intentar convertir a número si parece número
        input_data[k] = isNaN(v) || v === '' ? v : parseFloat(v);
    });

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Procesando...';
    resultEl.innerHTML = '';

    try {
        const res = await fetch(`${MODELING_API}/analytics/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_data }),
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();

        if (data.error) {
            resultEl.innerHTML = `<div class="badge badge-red">❌ ${data.error}</div>`;
        } else {
            const targetCol = MODELING_STATE.result.target_info.target;
            resultEl.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;background:#f0fdf4;padding:8px 16px;border-radius:12px;border:1px solid #bbf7d0">
                    <div style="font-size:12px;color:#166534;font-weight:600">Predicción ${targetCol}:</div>
                    <div style="font-size:18px;font-weight:700;color:#15803d">${data.prediction}</div>
                </div>
            `;
            showToast(`✨ Predicción obtenida: ${data.prediction}`, 'success');
        }
    } catch (e) {
        resultEl.innerHTML = `<div class="badge badge-red">❌ Error: ${e.message}</div>`;
        showToast(`❌ ${e.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔮 Realizar Predicción';
    }
}

function renderDataInfo(r) {
    const ds = r.data_summary || {};
    const sp = r.split_info || {};
    const bal = r.balance_info || {};
    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      <div class="mini-stat"><div class="mini-stat-val" style="color:#1a56db">${ds.n_samples || 0}</div><div class="mini-stat-lab">Muestras totales</div></div>
      <div class="mini-stat"><div class="mini-stat-val" style="color:#1a56db">${ds.n_features || 0}</div><div class="mini-stat-lab">Features</div></div>
      <div class="mini-stat"><div class="mini-stat-val" style="color:#059669">${sp.train_size || 0}</div><div class="mini-stat-lab">Train (${sp.train_pct||70}%)</div></div>
      <div class="mini-stat"><div class="mini-stat-val" style="color:#d97706">${sp.test_size || 0}</div><div class="mini-stat-lab">Test (${sp.test_pct||30}%)</div></div>
      <div class="mini-stat"><div class="mini-stat-val" style="color:${bal.applied?'#059669':'#6b7280'}">${bal.method||'N/A'}</div><div class="mini-stat-lab">Balanceo</div></div>
      <div class="mini-stat"><div class="mini-stat-val" style="color:#5850ec">${(r.target_info?.classes||[]).length}</div><div class="mini-stat-lab">Clases</div></div>
    </div>`;
}

function renderModelsComparison(r, color) {
    const models = r.models_results || [];
    if (models.length === 0) return '';
    const top3 = r.top3_models || [];
    return `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title">📊 Comparación de 7 Modelos (4 Supervisados + 3 Ensamble)</div>
        <span class="badge badge-blue">${models.length} modelos</span>
      </div>
      <div class="card-body" style="overflow-x:auto">
        <table class="data-table" style="width:100%;font-size:12px">
          <thead><tr>
            <th>Modelo</th><th>Tipo</th>
            <th>Accuracy CV</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>AUC-ROC</th>
            <th>Acc. Test</th><th>Top 3</th>
          </tr></thead>
          <tbody>
          ${models.map(m => {
            const isTop = top3.includes(m.name);
            const bg = isTop ? 'background:rgba(5,150,105,0.06)' : '';
            return `<tr style="${bg}">
              <td style="font-weight:600;white-space:nowrap">${m.name}</td>
              <td><span class="badge ${m.type==='ensamble'?'badge-amber':'badge-blue'}" style="font-size:10px">${m.type}</span></td>
              <td style="font-weight:700;color:${color}">${(m.cv_accuracy_mean*100).toFixed(1)}% <span style="color:#9ca3af;font-weight:400">±${(m.cv_accuracy_std*100).toFixed(1)}</span></td>
              <td>${(m.cv_precision_mean*100).toFixed(1)}%</td>
              <td>${(m.cv_recall_mean*100).toFixed(1)}%</td>
              <td>${(m.cv_f1_mean*100).toFixed(1)}%</td>
              <td>${m.test_auc_roc ? (m.test_auc_roc*100).toFixed(1)+'%' : '—'}</td>
              <td style="font-weight:600">${(m.test_accuracy*100).toFixed(1)}%</td>
              <td>${isTop ? '<span class="badge badge-green">★ Top 3</span>' : ''}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Charts row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card">
        <div class="card-header"><div class="card-title">📈 Accuracy por Modelo</div></div>
        <div class="card-body"><div style="height:280px"><canvas id="chart-model-comparison"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🎯 Métricas Radar — Top 3</div></div>
        <div class="card-body"><div style="height:280px"><canvas id="chart-model-radar"></canvas></div></div>
      </div>
    </div>`;
}

function renderAnovaTukey(r) {
    const at = r.anova_tukey || {};
    const anova = at.anova || {};
    const tukey = at.tukey_comparisons || [];
    return `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title">🔬 Análisis Estadístico — ANOVA + Tukey</div>
        <span class="badge ${anova.significant?'badge-green':'badge-amber'}">${anova.significant?'Diferencia significativa':'Sin diferencia significativa'}</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
          <div class="mini-stat"><div class="mini-stat-val" style="font-size:20px">${anova.f_statistic ?? '—'}</div><div class="mini-stat-lab">F-Statistic (ANOVA)</div></div>
          <div class="mini-stat"><div class="mini-stat-val" style="font-size:20px;color:${anova.p_value<0.05?'#059669':'#d97706'}">${anova.p_value ?? '—'}</div><div class="mini-stat-lab">P-valor</div></div>
          <div class="mini-stat"><div class="mini-stat-val" style="font-size:20px">${anova.significant?'Sí':'No'}</div><div class="mini-stat-lab">Significativo (α=0.05)</div></div>
        </div>
        ${tukey.length > 0 ? `
        <div style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:8px">Comparaciones Pareadas (Tukey/Bonferroni)</div>
        <div style="max-height:250px;overflow-y:auto">
          <table class="data-table" style="width:100%;font-size:12px">
            <thead><tr><th>Grupo 1</th><th>Grupo 2</th><th>Dif. Media</th><th>P-valor adj.</th><th>Significativo</th></tr></thead>
            <tbody>${tukey.map(t => `
              <tr><td>${t.group1}</td><td>${t.group2}</td>
              <td style="font-weight:600">${(t.mean_diff*100).toFixed(2)}%</td>
              <td>${t.p_value.toFixed(4)}</td>
              <td>${t.significant?'<span class="badge badge-green" style="font-size:10px">Sí ✓</span>':'<span class="badge badge-gray" style="font-size:10px">No</span>'}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>` : '<div style="font-size:13px;color:var(--gray-400)">No hay comparaciones disponibles.</div>'}
        <div class="alert alert-info" style="margin-top:16px">
          <div class="alert-icon">📖</div>
          <div style="font-size:12px"><strong>Interpretación:</strong> ANOVA evalúa si hay diferencia significativa entre las medias de accuracy de los 7 modelos. Las comparaciones Tukey/Bonferroni identifican cuáles pares de modelos difieren significativamente entre sí.</div>
        </div>
      </div>
    </div>`;
}

function renderGridSearch(r, color) {
    const gs = r.gridsearch_results || [];
    if (gs.length === 0) return '';
    return `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title">⚙️ Hiperparametrización — GridSearchCV (Top 3)</div>
        <span class="badge badge-blue">Optimización</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
          ${gs.map(g => `
          <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--r-lg);padding:20px">
            <div style="font-size:14px;font-weight:700;color:var(--gray-800);margin-bottom:8px">${g.model_name}</div>
            ${g.error ? `<div style="color:var(--red-flag);font-size:12px">${g.error}</div>` : `
            <div style="font-size:24px;font-weight:700;color:${color};margin-bottom:8px">${(g.best_cv_score*100).toFixed(1)}%</div>
            <div style="font-size:11px;color:var(--gray-400);margin-bottom:4px">Accuracy CV optimizado</div>
            <div style="font-size:11px;color:var(--gray-400);margin-bottom:12px">Test: ${(g.test_accuracy_after*100).toFixed(1)}% · Mejora: ${g.improvement>0?'+':''}${(g.improvement*100).toFixed(2)}%</div>
            <div style="font-size:11px;font-weight:600;color:var(--gray-600);margin-bottom:4px">Mejores hiperparámetros:</div>
            ${Object.entries(g.best_params||{}).map(([k,v]) => `<div style="font-size:11px;color:var(--gray-500);font-family:var(--font-mono)">${k}: <strong>${v}</strong></div>`).join('')}
            `}
          </div>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderBestModel(r, color) {
    const best = r.best_model || {};
    const pipe = r.pipeline_info || {};
    if (!best.name || best.name === 'N/A') return '';
    return `
    <div class="card" style="border:2px solid ${color};margin-bottom:20px">
      <div class="card-header" style="background:${color}10">
        <div class="card-title">🏆 Modelo Final — Pipeline para Despliegue</div>
        <span class="badge badge-green">✓ Listo para producción</span>
      </div>
      <div class="card-body" style="text-align:center;padding:32px">
        <div style="font-size:48px;margin-bottom:8px">🏆</div>
        <div style="font-size:22px;font-weight:700;color:var(--gray-900);margin-bottom:4px">${best.name}</div>
        <div style="font-size:42px;font-weight:700;color:${color};margin-bottom:8px">${(best.final_test_accuracy*100).toFixed(1)}%</div>
        <div style="font-size:13px;color:var(--gray-400);margin-bottom:20px">Accuracy en conjunto de prueba (30%)</div>
        <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:24px">
          ${(best.pipeline_steps||[]).map((s,i) => `
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:32px;height:32px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:${color}">${i+1}</div>
              <span style="font-size:13px;font-weight:500">${s}</span>
              ${i < (best.pipeline_steps||[]).length-1 ? '<span style="color:var(--gray-300);font-size:18px">→</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div style="font-size:12px;color:var(--gray-400)">Pipeline serializado: ${best.pipeline_size_kb} KB · Listo para despliegue con sklearn</div>
      </div>
    </div>`;
}

// ── Gráficos de comparación ─────────────────────────────────
function renderModelComparisonChart(r, color) {
    const models = r.models_results || [];
    if (models.length === 0) return;
    const canvas = document.getElementById('chart-model-comparison');
    if (!canvas) return;
    destroyChart('chart-model-comparison');
    const ctx = canvas.getContext('2d');
    const top3 = r.top3_models || [];
    const colors = models.map(m => top3.includes(m.name) ? '#059669' : color);
    chartInstances['chart-model-comparison'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: models.map(m => m.name.split('(')[0].trim()),
            datasets: [
                { label: 'Accuracy CV (%)', data: models.map(m => +(m.cv_accuracy_mean*100).toFixed(1)), backgroundColor: colors.map(c => c+'99'), borderColor: colors, borderWidth: 2, borderRadius: 6 },
                { label: 'F1-Score CV (%)', data: models.map(m => +(m.cv_f1_mean*100).toFixed(1)), backgroundColor: '#b4530920', borderColor: '#b45309', borderWidth: 2, borderRadius: 6 },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            plugins: { legend: { labels: { font: { size: 11 }, color: '#374151' } } },
            scales: {
                x: { min: 0, max: 100, ticks: { color: '#6b7280', callback: v => v+'%' }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { ticks: { color: '#374151', font: { size: 11 } }, grid: { display: false } },
            },
        },
    });
}

function renderRadarChart(r, color) {
    const models = r.models_results || [];
    const top3 = r.top3_models || [];
    const topModels = models.filter(m => top3.includes(m.name)).slice(0, 3);
    if (topModels.length === 0) return;
    const canvas = document.getElementById('chart-model-radar');
    if (!canvas) return;
    destroyChart('chart-model-radar');
    const ctx = canvas.getContext('2d');
    const radarColors = ['#1a56db', '#059669', '#b45309'];
    chartInstances['chart-model-radar'] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'AUC-ROC'],
            datasets: topModels.map((m, i) => ({
                label: m.name.split('(')[0].trim(),
                data: [m.test_accuracy*100, m.test_precision*100, m.test_recall*100, m.test_f1*100, (m.test_auc_roc||0)*100],
                borderColor: radarColors[i], backgroundColor: radarColors[i]+'15', borderWidth: 2, pointRadius: 3,
            })),
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 10 }, color: '#374151' } } },
            scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.06)' }, pointLabels: { font: { size: 11 } } } },
        },
    });
}

// ============================================================
//  MÓDULO: Business Understanding (CRISP-DM Fase 1)
//  Se inyecta automáticamente en todas las páginas de sección.
// ============================================================
const BusinessUnderstanding = (() => {
    const API = (typeof CONFIG !== 'undefined' && CONFIG.backendApiBase)
        ? CONFIG.backendApiBase : 'https://datosparatodos-production.up.railway.app';

    let _state = { pregunta: '', objetivo: '', target_sugerido: '', kpis: [], contexto: '', confirmed: false };
    let _generating = false;

    // ── CSS ──────────────────────────────────────────────────
    function _injectCSS() {
        if (document.getElementById('bu-styles')) return;
        const s = document.createElement('style');
        s.id = 'bu-styles';
        s.textContent = `
            #bu-card {
                background: linear-gradient(135deg, #f0f7ff 0%, #fafbff 100%);
                border: 1.5px solid #bfdbfe;
                border-radius: 12px;
                margin-bottom: 20px;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            #bu-card .bu-header {
                padding: 14px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid #bfdbfe;
                background: #e0eeff;
                gap: 12px;
            }
            #bu-card .bu-header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #bu-card .bu-badge {
                background: #1a56db;
                color: white;
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 100px;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                flex-shrink: 0;
            }
            #bu-card .bu-title {
                font-size: 14px;
                font-weight: 700;
                color: #1e3a8a;
            }
            #bu-card .bu-subtitle {
                font-size: 11px;
                color: #3b82f6;
                margin-top: 1px;
            }
            #bu-card .bu-body {
                padding: 20px;
            }
            #bu-card .bu-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 16px;
            }
            #bu-card .bu-field label {
                font-size: 11px;
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: block;
                margin-bottom: 6px;
            }
            #bu-card .bu-field textarea,
            #bu-card .bu-field input {
                width: 100%;
                padding: 10px 12px;
                border: 1.5px solid #d1d5db;
                border-radius: 8px;
                font-size: 13.5px;
                font-family: var(--font-sans, sans-serif);
                color: #111827;
                background: white;
                resize: vertical;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
                line-height: 1.5;
            }
            #bu-card .bu-field textarea:focus,
            #bu-card .bu-field input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
            }
            #bu-card .bu-kpis {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 6px;
            }
            #bu-card .bu-kpi-tag {
                background: #dbeafe;
                color: #1d4ed8;
                font-size: 12px;
                font-weight: 500;
                padding: 3px 10px;
                border-radius: 100px;
                border: 1px solid #bfdbfe;
            }
            #bu-card .bu-actions {
                display: flex;
                gap: 8px;
                align-items: center;
                margin-top: 16px;
                flex-wrap: wrap;
            }
            #bu-card .bu-btn-gen {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: #1a56db;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s, opacity 0.2s;
            }
            #bu-card .bu-btn-gen:hover { background: #1e40af; }
            #bu-card .bu-btn-gen:disabled { opacity: 0.55; cursor: not-allowed; }
            #bu-card .bu-btn-confirm {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: #059669;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            #bu-card .bu-btn-confirm:hover { background: #047857; }
            #bu-card .bu-confirmed-banner {
                display: none;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                background: #d1fae5;
                border: 1px solid #6ee7b7;
                border-radius: 8px;
                font-size: 13px;
                color: #065f46;
                font-weight: 500;
                margin-top: 12px;
            }
            #bu-card .bu-gen-spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid rgba(255,255,255,0.4);
                border-top-color: white;
                border-radius: 50%;
                animation: buSpin 0.7s linear infinite;
            }
            @keyframes buSpin { to { transform: rotate(360deg); } }
            #bu-card .bu-ctx {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px 14px;
                font-size: 13px;
                color: #374151;
                line-height: 1.6;
                margin-bottom: 16px;
            }
            #bu-card .bu-target-chip {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: #fef3c7;
                border: 1px solid #fbbf24;
                color: #92400e;
                font-size: 12px;
                font-weight: 600;
                padding: 3px 10px;
                border-radius: 100px;
            }
            @media (max-width: 700px) {
                #bu-card .bu-grid { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(s);
    }

    // ── HTML ─────────────────────────────────────────────────
    function _injectCard() {
        if (document.getElementById('bu-card')) return;
        const wrap = document.getElementById('stepTabsWrap');
        if (!wrap) return;

        const card = document.createElement('div');
        card.id = 'bu-card';
        card.style.display = 'none';
        card.innerHTML = `
            <div class="bu-header" onclick="BusinessUnderstanding.toggleBody()">
                <div class="bu-header-left">
                    <span class="bu-badge">CRISP-DM Fase 1</span>
                    <div>
                        <div class="bu-title">🏢 Comprensión del Negocio</div>
                        <div class="bu-subtitle">Define el problema analítico antes de explorar los datos</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span id="bu-status-chip" style="font-size:11px;color:#6b7280"></span>
                    <span id="bu-chevron" style="font-size:16px;color:#3b82f6;transition:transform 0.2s">▼</span>
                </div>
            </div>
            <div class="bu-body" id="bu-body">
                <div id="bu-ctx-wrap" style="display:none">
                    <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Contexto del dominio</div>
                    <div class="bu-ctx" id="bu-ctx-text"></div>
                </div>

                <div class="bu-grid">
                    <div class="bu-field" style="grid-column:1/-1">
                        <label>Pregunta analítica principal</label>
                        <textarea id="bu-pregunta" rows="2" placeholder="¿Qué pregunta quieres responder con este dataset?"></textarea>
                    </div>
                    <div class="bu-field">
                        <label>Objetivo del análisis</label>
                        <textarea id="bu-objetivo" rows="2" placeholder="¿Para qué se usarán los resultados y quién se beneficia?"></textarea>
                    </div>
                    <div class="bu-field">
                        <label>Variable objetivo sugerida (target)</label>
                        <input type="text" id="bu-target" placeholder="Columna para clasificación..." />
                        <div style="margin-top:6px;font-size:11px;color:#6b7280">Puedes cambiar la variable objetivo en la pestaña de Modelado.</div>
                    </div>
                </div>

                <div style="margin-bottom:16px">
                    <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">KPIs / Métricas de éxito</div>
                    <div class="bu-kpis" id="bu-kpis"></div>
                </div>

                <div class="bu-actions">
                    <button class="bu-btn-gen" id="bu-btn-gen" onclick="BusinessUnderstanding.generate()">
                        <span id="bu-gen-icon">✨</span> Sugerir con IA (Gemini)
                    </button>
                    <button class="bu-btn-confirm" onclick="BusinessUnderstanding.confirm()">
                        ✓ Confirmar comprensión del negocio
                    </button>
                    <span style="font-size:12px;color:#9ca3af">Puedes editar los campos antes de confirmar</span>
                </div>

                <div class="bu-confirmed-banner" id="bu-confirmed-banner">
                    ✅ <strong>Comprensión del negocio confirmada.</strong> Los análisis siguientes estarán alineados con tu objetivo.
                </div>
            </div>
        `;
        wrap.parentNode.insertBefore(card, wrap);
    }

    // ── API call ─────────────────────────────────────────────
    async function generate() {
        if (_generating) return;
        const _page = window.PAGE || {};
        const data = _page.rawData || _page.cleanData || [];
        if (!data.length) { alert('Carga un dataset primero.'); return; }

        _generating = true;
        const btn = document.getElementById('bu-btn-gen');
        const icon = document.getElementById('bu-gen-icon');
        if (btn) btn.disabled = true;
        if (icon) icon.outerHTML = '<span id="bu-gen-icon" class="bu-gen-spinner"></span>';

        try {
            const columns = Object.keys(data[0]);
            const sample  = data.slice(0, 5);
            // Resolve dataset name from page state (activeDataset index + section.datasets)
            let dsName = document.title || '';
            try {
                const PAGE = window.PAGE || {};
                const sec  = window.section || {};
                if (sec.datasets && PAGE.activeDataset != null) {
                    const ds = sec.datasets[PAGE.activeDataset];
                    dsName = ds?.title || ds?.name || dsName;
                }
            } catch(_) {}

            const res = await fetch(`${API}/chat/business-understanding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columns, sample, dataset_name: dsName }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const ex = new Error(err.detail || `HTTP ${res.status}`);
                ex.status = res.status;
                throw ex;
            }
            const d = await res.json();

            document.getElementById('bu-pregunta').value   = d.pregunta || '';
            document.getElementById('bu-objetivo').value   = d.objetivo  || '';
            document.getElementById('bu-target').value     = d.target_sugerido || '';

            const kpisEl = document.getElementById('bu-kpis');
            if (kpisEl) {
                kpisEl.innerHTML = (d.kpis || []).map(k =>
                    `<span class="bu-kpi-tag">${k}</span>`).join('');
            }
            const ctxEl = document.getElementById('bu-ctx-text');
            const ctxWrap = document.getElementById('bu-ctx-wrap');
            if (ctxEl && d.contexto) {
                ctxEl.textContent = d.contexto;
                if (ctxWrap) ctxWrap.style.display = 'block';
            }

            _state = { ...d, confirmed: false };
            _setStatusChip('✨ Sugerencia generada — edita y confirma', '#b45309');
        } catch (e) {
            console.error('[BU] generate error:', e);
            if (e.status === 429 || (e.message && e.message.includes('429'))) {
                _setStatusChip('⏳ Cuota agotada — espera unos segundos y reintenta', '#b45309');
            } else {
                _setStatusChip('Error al generar — revisa la conexión', '#dc2626');
            }
        } finally {
            _generating = false;
            const btn2 = document.getElementById('bu-btn-gen');
            if (btn2) { btn2.disabled = false; btn2.innerHTML = '<span id="bu-gen-icon">✨</span> Sugerir con IA (Gemini)'; }
        }
    }

    function confirm() {
        _state.pregunta = document.getElementById('bu-pregunta')?.value || '';
        _state.objetivo = document.getElementById('bu-objetivo')?.value  || '';
        _state.target_sugerido = document.getElementById('bu-target')?.value || '';
        _state.confirmed = true;

        const banner = document.getElementById('bu-confirmed-banner');
        if (banner) banner.style.display = 'flex';
        _setStatusChip('✅ Confirmada', '#059669');

        // Sincronizar target con el selector de modelado si existe
        const targetSelect = document.getElementById('targetSelect');
        if (targetSelect && _state.target_sugerido) {
            for (const opt of targetSelect.options) {
                if (opt.value === _state.target_sugerido) {
                    targetSelect.value = _state.target_sugerido;
                    if (typeof onTargetChange === 'function') onTargetChange();
                    break;
                }
            }
        }
    }

    function toggleBody() {
        const body    = document.getElementById('bu-body');
        const chevron = document.getElementById('bu-chevron');
        if (!body) return;
        const collapsed = body.style.display === 'none';
        body.style.display    = collapsed ? 'block' : 'none';
        if (chevron) chevron.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
    }

    function show(autoGenerate = true) {
        const card = document.getElementById('bu-card');
        if (card) card.style.display = 'block';
        if (autoGenerate && !_state.pregunta) generate();
    }

    function getState() { return { ..._state }; }

    function _setStatusChip(text, color) {
        const el = document.getElementById('bu-status-chip');
        if (el) { el.textContent = text; el.style.color = color; }
    }

    // ── Auto-init on DOMContentLoaded ────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('stepTabsWrap')) return;
        _injectCSS();
        _injectCard();
    });

    return { generate, confirm, toggleBody, show, getState };
})();
