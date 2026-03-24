// ============================================================
//  DatosParaTodos — Chat Widget
//  Llama directamente a la API REST de Gemini desde el frontend.
//  No requiere backend.
// ============================================================

const GEMINI_REST_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const ChatWidget = (() => {
    let isOpen = false;
    let isLoading = false;
    let history = [];     // [{role:'user'|'model', parts:[{text}]}]
    let systemPrompt = '';
    let _apiKey = '';

    // ── PROMPTS ─────────────────────────────────────────────
    const NAVIGATION_PROMPT = `Eres el agente de navegación de DatosParaTodos, una plataforma de democratización de datos públicos del municipio de Medellín. Tu rol es recibir al usuario, entender su necesidad y orientarlo hacia la sección correcta.

Las secciones disponibles son: economía, educación, medio ambiente, movilidad, salud, seguridad, servicios, trámites.

Reglas:
1. Saluda y pregunta en qué puedes ayudar.
2. Identifica la sección correcta y explica por qué.
3. Si no encaja claramente, pide más detalle.
4. Responde siempre en español, tono cercano y claro.`;

    const SPECIALIST_PROMPT = (categoria, conclusiones) => `Eres un agente especialista en ${categoria} para DatosParaTodos, una plataforma de datos públicos de Medellín.

Contexto del análisis de datos:
${conclusiones}

Reglas:
1. Eres experto en ${categoria} en el contexto de Medellín.
2. Responde basándote en el contexto de análisis proporcionado.
3. Si una pregunta va más allá del contexto, indícalo claramente.
4. Cita datos concretos del contexto cuando sea posible.
5. Responde en español, tono profesional pero accesible.`;

    // ── INIT ────────────────────────────────────────────────
    function init({ agentType = 'navigation', categoria = '', conclusiones = '', containerId = 'chat-widget-root' } = {}) {
        const isInline = agentType === 'specialist';
        isOpen = isInline;
        history = [];

        if (agentType === 'specialist') {
            systemPrompt = SPECIALIST_PROMPT(categoria, conclusiones);
        } else {
            systemPrompt = NAVIGATION_PROMPT;
        }

        _injectStyles();
        _buildDOM(containerId, agentType);

        // Intentar obtener la key almacenada
        _apiKey = localStorage.getItem('gemini_api_key') || '';
        const keyInput = document.getElementById('cwApiKey');
        if (keyInput && _apiKey) keyInput.value = _apiKey;

        // Auto-greet si ya hay key
        if (_apiKey) {
            _sendToGemini('Preséntate brevemente al usuario.');
        } else {
            _appendMessage('agent', '🔑 Para comenzar, ingresa tu API Key de Google Gemini arriba. Es gratuita y la puedes obtener en [aistudio.google.com](https://aistudio.google.com/app/apikey).');
            _setInputEnabled(false);
        }

        window.addEventListener('beforeunload', destroy);
    }

    // ── GEMINI REST API ─────────────────────────────────────
    async function _sendToGemini(userText) {
        if (!_apiKey) {
            _appendMessage('agent', '⚠️ Necesitas ingresar tu API Key de Gemini para poder chatear.');
            return;
        }

        try {
            // Build contents: system instruction + history + new message
            const contents = [];

            // Add history
            for (const turn of history) {
                contents.push(turn);
            }

            // Add user message
            contents.push({ role: 'user', parts: [{ text: userText }] });

            const body = {
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: contents
            };

            const res = await fetch(`${GEMINI_REST_URL}?key=${_apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const msg = errorData?.error?.message || `HTTP ${res.status}`;
                if (res.status === 429) {
                    throw new Error('⏳ Límite de cuota alcanzado. Espera unos segundos e intenta de nuevo.');
                }
                if (res.status === 400 && msg.includes('API key')) {
                    throw new Error('🔑 API Key inválida. Verifica que sea correcta.');
                }
                throw new Error(msg);
            }

            const data = await res.json();
            const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.';

            // Store in history
            history.push({ role: 'user', parts: [{ text: userText }] });
            history.push({ role: 'model', parts: [{ text: reply }] });

            return reply;
        } catch (e) {
            throw e;
        }
    }

    async function sendMessage(text) {
        if (!text.trim() || isLoading) return;
        isLoading = true;
        _appendMessage('user', text);
        _setInputEnabled(false);
        _showTyping();

        try {
            const reply = await _sendToGemini(text);
            _hideTyping();
            _appendMessage('agent', reply);
        } catch (e) {
            _hideTyping();
            _appendMessage('agent', `⚠️ ${e.message}`);
            console.error('[ChatWidget] Error:', e);
        } finally {
            isLoading = false;
            _setInputEnabled(true);
        }
    }

    function destroy() {
        history = [];
        const root = document.getElementById('cwPanel');
        if (root) root.innerHTML = '';
    }

    // ── API KEY ─────────────────────────────────────────────
    function _saveApiKey() {
        const input = document.getElementById('cwApiKey');
        if (!input) return;
        const key = input.value.trim();
        if (!key) return;
        _apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        _setInputEnabled(true);
        // Clear messages and send greeting
        const msgs = document.getElementById('cwMessages');
        if (msgs) msgs.innerHTML = '';
        history = [];
        _showTyping();
        _sendToGemini('Preséntate brevemente al usuario.').then(reply => {
            _hideTyping();
            _appendMessage('agent', reply);
        }).catch(e => {
            _hideTyping();
            _appendMessage('agent', `⚠️ ${e.message}`);
        });
    }

    // ── DOM ─────────────────────────────────────────────────
    function _buildDOM(containerId, agentType) {
        const isNav = agentType === 'navigation';
        const isInline = agentType === 'specialist';
        const container = document.getElementById(containerId);
        if (!container) return;

        const triggerHtml = isInline ? '' : `
      <button class="cw-trigger" id="cwTrigger" onclick="ChatWidget.toggle()" aria-label="Abrir asistente">
        <span class="cw-trigger-icon">🤖</span>
        <span class="cw-trigger-label">${isNav ? 'Asistente' : 'Preguntar al experto'}</span>
        <span class="cw-trigger-dot"></span>
      </button>`;

        const panelClasses = `cw-panel ${isInline ? 'cw-inline cw-open' : ''}`;

        const apiKeyBar = `
      <div class="cw-apikey-bar">
        <span class="cw-apikey-icon">🔑</span>
        <input type="password" class="cw-apikey-input" id="cwApiKey"
          placeholder="Pega tu API Key de Gemini aquí"
          onkeydown="if(event.key==='Enter'){ChatWidget._saveApiKey();}">
        <a href="https://aistudio.google.com/app/apikey" target="_blank" class="cw-apikey-link">Obtener ↗</a>
        <button class="cw-apikey-btn" onclick="ChatWidget._saveApiKey()">Conectar</button>
      </div>`;

        const closeHtml = isInline ? '' : `
          <button class="cw-close" onclick="ChatWidget.toggle()" aria-label="Cerrar chat">✕</button>`;

        container.innerHTML = `
      ${triggerHtml}
      <div class="${panelClasses}" id="cwPanel" role="dialog" aria-label="Chat con asistente">
        <div class="cw-header">
          <div class="cw-header-info">
            <div class="cw-avatar">🤖</div>
            <div>
              <div class="cw-agent-name">${isNav ? 'Asistente DatosParaTodos' : 'Experto en datos'}</div>
              <div class="cw-agent-status"><span class="cw-status-dot"></span> En línea</div>
            </div>
          </div>
          ${closeHtml}
        </div>

        ${apiKeyBar}

        <div class="cw-messages" id="cwMessages"></div>

        <div class="cw-footer">
          <div class="cw-input-row">
            <textarea class="cw-input" id="cwInput"
              placeholder="${isNav ? '¿Qué información buscas?' : '¿Qué quieres saber sobre estos datos?'}"
              rows="1"
              onkeydown="ChatWidget._handleKey(event)"
              oninput="ChatWidget._autoResize(this)"
              disabled></textarea>
            <button class="cw-send" id="cwSend" onclick="ChatWidget._submitInput()" disabled aria-label="Enviar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <div class="cw-hint">Presiona <kbd>Enter</kbd> para enviar · <kbd>Shift+Enter</kbd> para nueva línea</div>
        </div>
      </div>
    `;
    }

    function toggle() {
        isOpen = !isOpen;
        const panel = document.getElementById('cwPanel');
        const trigger = document.getElementById('cwTrigger');
        if (panel && !panel.classList.contains('cw-inline')) {
            panel.classList.toggle('cw-open', isOpen);
        }
        if (trigger) trigger.classList.toggle('cw-active', isOpen);
        if (isOpen) {
            setTimeout(() => {
                const input = document.getElementById('cwInput');
                if (input && !input.disabled) input.focus();
                _scrollToBottom();
            }, 300);
        }
    }

    function _appendMessage(role, text) {
        const container = document.getElementById('cwMessages');
        if (!container) return;
        const isAgent = role === 'agent';
        const div = document.createElement('div');
        div.className = `cw-message cw-message-${role}`;
        div.innerHTML = `
      ${isAgent ? '<div class="cw-msg-avatar">🤖</div>' : ''}
      <div class="cw-bubble">${_formatText(text)}</div>
    `;
        container.appendChild(div);
        _scrollToBottom();
    }

    function _showTyping() {
        const container = document.getElementById('cwMessages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'cw-message cw-message-agent cw-typing-msg';
        div.id = 'cwTyping';
        div.innerHTML = `
      <div class="cw-msg-avatar">🤖</div>
      <div class="cw-bubble cw-typing">
        <span></span><span></span><span></span>
      </div>
    `;
        container.appendChild(div);
        _scrollToBottom();
    }

    function _hideTyping() { document.getElementById('cwTyping')?.remove(); }

    function _setInputEnabled(enabled) {
        const input = document.getElementById('cwInput');
        const send = document.getElementById('cwSend');
        if (input) input.disabled = !enabled;
        if (send) send.disabled = !enabled;
    }

    function _scrollToBottom() {
        const container = document.getElementById('cwMessages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    function _formatText(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#3b82f6">$1</a>')
            .replace(/\n/g, '<br>');
    }

    function _handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            _submitInput();
        }
    }

    function _submitInput() {
        const input = document.getElementById('cwInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        input.style.height = 'auto';
        sendMessage(text);
    }

    function _autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    // ── STYLES ──────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('cw-styles')) return;
        const style = document.createElement('style');
        style.id = 'cw-styles';
        style.textContent = `
      /* ── TRIGGER BUTTON ── */
      .cw-trigger {
        position: fixed;
        bottom: 28px; right: 28px; z-index: 1000;
        display: flex; align-items: center; gap: 10px;
        padding: 12px 20px 12px 14px;
        background: #0d2240; color: white; border: none;
        border-radius: 50px; font-size: 14px; font-weight: 600;
        font-family: 'DM Sans', sans-serif; cursor: pointer;
        box-shadow: 0 4px 24px rgba(13,34,64,0.45);
        transition: all 0.25s cubic-bezier(.175,.885,.32,1.275);
      }
      .cw-trigger:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(13,34,64,0.5); }
      .cw-trigger.cw-active { background: #1f2937; }
      .cw-trigger-icon { font-size: 20px; }
      .cw-trigger-dot {
        position: absolute; top: 8px; right: 8px;
        width: 9px; height: 9px;
        background: #4ade80; border-radius: 50%;
        border: 2px solid #0d2240;
        animation: cw-pulse 2s infinite;
      }
      .cw-trigger.cw-active .cw-trigger-dot { display: none; }

      /* ── PANEL ── */
      .cw-panel {
        position: fixed; bottom: 96px; right: 28px; z-index: 999;
        width: 380px; max-height: 560px;
        background: white; border-radius: 20px;
        box-shadow: 0 20px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
        display: flex; flex-direction: column; overflow: hidden;
        transform: scale(0.92) translateY(16px);
        transform-origin: bottom right;
        opacity: 0; pointer-events: none;
        transition: all 0.28s cubic-bezier(.175,.885,.32,1.275);
        border: 1px solid rgba(0,0,0,0.06);
      }
      .cw-panel.cw-open {
        transform: scale(1) translateY(0);
        opacity: 1; pointer-events: all;
      }

      /* ── INLINE MODE ── */
      .cw-panel.cw-inline {
        position: relative; bottom: auto; right: auto;
        width: 100%; max-height: none; height: 520px;
        transform: none; opacity: 1; pointer-events: all;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        border: 1px solid #e5e7eb; z-index: 10;
        margin-top: 10px; border-radius: 12px;
      }

      /* ── API KEY BAR ── */
      .cw-apikey-bar {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px;
        background: #f0f9ff;
        border-bottom: 1px solid #e0f2fe;
        flex-shrink: 0;
      }
      .cw-apikey-icon { font-size: 14px; }
      .cw-apikey-input {
        flex: 1; padding: 6px 10px;
        border: 1px solid #cbd5e1; border-radius: 8px;
        font-size: 12px; font-family: 'DM Sans', sans-serif;
        color: #1e293b; background: white; outline: none;
      }
      .cw-apikey-input:focus { border-color: #3b82f6; }
      .cw-apikey-link {
        font-size: 11px; color: #3b82f6;
        text-decoration: none; white-space: nowrap;
      }
      .cw-apikey-link:hover { text-decoration: underline; }
      .cw-apikey-btn {
        padding: 5px 12px; background: #0d2240; color: white;
        border: none; border-radius: 8px; font-size: 12px;
        font-weight: 600; cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: background 0.2s;
      }
      .cw-apikey-btn:hover { background: #1a3a6b; }

      /* ── HEADER ── */
      .cw-header {
        padding: 16px 20px; background: #0d2240;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0;
      }
      .cw-header-info { display: flex; align-items: center; gap: 12px; }
      .cw-avatar {
        width: 38px; height: 38px;
        background: rgba(255,255,255,0.12); border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .cw-agent-name {
        font-size: 14px; font-weight: 600; color: white;
        font-family: 'DM Sans', sans-serif;
      }
      .cw-agent-status {
        font-size: 11px; color: rgba(255,255,255,0.55);
        display: flex; align-items: center; gap: 5px; margin-top: 2px;
      }
      .cw-status-dot {
        width: 6px; height: 6px;
        background: #4ade80; border-radius: 50%;
        animation: cw-pulse 2s infinite;
      }
      .cw-close {
        background: rgba(255,255,255,0.1); border: none;
        color: rgba(255,255,255,0.7);
        width: 30px; height: 30px; border-radius: 50%;
        cursor: pointer; font-size: 13px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .cw-close:hover { background: rgba(255,255,255,0.2); color: white; }

      /* ── MESSAGES ── */
      .cw-messages {
        flex: 1; overflow-y: auto;
        padding: 20px 16px;
        display: flex; flex-direction: column; gap: 14px;
        scroll-behavior: smooth; background: #f9fafb;
      }
      .cw-messages::-webkit-scrollbar { width: 4px; }
      .cw-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

      .cw-message { display: flex; align-items: flex-end; gap: 8px; animation: cw-fadeUp 0.25s ease; }
      .cw-message-user { flex-direction: row-reverse; }
      .cw-msg-avatar {
        width: 28px; height: 28px;
        background: #e5e7eb; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0;
      }
      .cw-bubble {
        max-width: 80%; padding: 10px 14px;
        border-radius: 16px; font-size: 13.5px;
        line-height: 1.55; font-family: 'DM Sans', sans-serif;
      }
      .cw-message-agent .cw-bubble {
        background: white; color: #1f2937;
        border-radius: 4px 16px 16px 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        border: 1px solid #e5e7eb;
      }
      .cw-message-user .cw-bubble {
        background: #0d2240; color: white;
        border-radius: 16px 4px 16px 16px;
      }

      /* ── TYPING ── */
      .cw-typing { display: flex; align-items: center; gap: 5px; padding: 12px 16px; }
      .cw-typing span {
        width: 7px; height: 7px; background: #9ca3af;
        border-radius: 50%; animation: cw-bounce 1.2s infinite ease-in-out;
      }
      .cw-typing span:nth-child(2) { animation-delay: 0.15s; }
      .cw-typing span:nth-child(3) { animation-delay: 0.3s; }

      /* ── FOOTER ── */
      .cw-footer {
        padding: 12px 14px 14px;
        border-top: 1px solid #f3f4f6;
        background: white; flex-shrink: 0;
      }
      .cw-input-row { display: flex; gap: 8px; align-items: flex-end; }
      .cw-input {
        flex: 1; padding: 10px 14px;
        border: 1.5px solid #e5e7eb; border-radius: 12px;
        font-size: 13.5px; font-family: 'DM Sans', sans-serif;
        color: #1f2937; resize: none; outline: none;
        line-height: 1.5; transition: border-color 0.2s;
        max-height: 120px; overflow-y: auto;
      }
      .cw-input:focus { border-color: #0d2240; }
      .cw-input:disabled { background: #f9fafb; }
      .cw-input::placeholder { color: #9ca3af; }

      .cw-send {
        width: 40px; height: 40px; background: #0d2240;
        border: none; border-radius: 12px; color: white;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transition: all 0.2s;
      }
      .cw-send:hover { background: #1a3a6b; transform: scale(1.05); }
      .cw-send:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }

      .cw-hint {
        font-size: 10.5px; color: #9ca3af;
        margin-top: 6px; text-align: center;
        font-family: 'DM Sans', sans-serif;
      }
      .cw-hint kbd {
        background: #f3f4f6; border: 1px solid #d1d5db;
        border-radius: 3px; padding: 1px 4px;
        font-size: 10px; font-family: 'DM Mono', monospace;
      }

      /* ── ANIMATIONS ── */
      @keyframes cw-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(0.85); }
      }
      @keyframes cw-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
        40% { transform: translateY(-5px); opacity: 1; }
      }
      @keyframes cw-fadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }

      /* ── RESPONSIVE ── */
      @media (max-width: 480px) {
        .cw-panel { width: calc(100vw - 24px); right: 12px; bottom: 80px; }
        .cw-trigger { right: 16px; bottom: 16px; }
      }
    `;
        document.head.appendChild(style);
    }

    // ── PUBLIC API ──────────────────────────────────────────
    return { init, toggle, sendMessage, destroy, _handleKey, _submitInput, _autoResize, _saveApiKey };
})();