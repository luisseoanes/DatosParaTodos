// ============================================================
//  DatosParaTodos — Chat Widget
//  Maneja la comunicación con los dos agentes del backend
//  Uso: incluir en index.html y en secciones/*.html
// ============================================================

const CHAT_API = 'http://localhost:8000/chat';

const ChatWidget = (() => {
    let sessionId = null;
    let isOpen = false;
    let isLoading = false;

    // ── INIT ──────────────────────────────────────────────────
    function init({ agentType = 'navigation', categoria = '', conclusiones = '', containerId = 'chat-widget-root' } = {}) {
        _injectStyles();
        _buildDOM(containerId, agentType);
        _startSession(agentType, categoria, conclusiones);

        window.addEventListener('beforeunload', destroy);
    }

    // ── SESSION ───────────────────────────────────────────────
    async function _startSession(agentType, categoria, conclusiones) {
        try {
            const body = { agent_type: agentType };
            if (agentType === 'specialist') {
                body.categoria = categoria;
                body.conclusiones = conclusiones || 'Análisis pendiente.';
            }

            const res = await fetch(`${CHAT_API}/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            sessionId = data.session_id;
            _appendMessage('agent', data.reply);
        } catch (e) {
            _appendMessage('agent', '⚠️ No se pudo conectar con el asistente. Verifica que el servidor esté activo.');
            console.error('[ChatWidget] Session error:', e);
        }
    }

    async function sendMessage(text) {
        if (!text.trim() || isLoading || !sessionId) return;
        isLoading = true;
        _appendMessage('user', text);
        _setInputEnabled(false);
        _showTyping();

        try {
            const res = await fetch(`${CHAT_API}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: text }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            _hideTyping();
            _appendMessage('agent', data.reply);
        } catch (e) {
            _hideTyping();
            _appendMessage('agent', '⚠️ Error al enviar el mensaje. Intenta de nuevo.');
            console.error('[ChatWidget] Message error:', e);
        } finally {
            isLoading = false;
            _setInputEnabled(true);
        }
    }

    async function destroy() {
        if (!sessionId) return;
        try {
            await fetch(`${CHAT_API}/session/${sessionId}`, { method: 'DELETE', keepalive: true });
        } catch (_) { }
        sessionId = null;
    }

    // ── DOM ───────────────────────────────────────────────────
    function _buildDOM(containerId, agentType) {
        const isNav = agentType === 'navigation';
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
      <!-- Trigger button -->
      <button class="cw-trigger" id="cwTrigger" onclick="ChatWidget.toggle()" aria-label="Abrir asistente">
        <span class="cw-trigger-icon">🤖</span>
        <span class="cw-trigger-label">${isNav ? 'Asistente' : 'Preguntar al experto'}</span>
        <span class="cw-trigger-dot"></span>
      </button>

      <!-- Chat panel -->
      <div class="cw-panel" id="cwPanel" role="dialog" aria-modal="true" aria-label="Chat con asistente">
        <div class="cw-header">
          <div class="cw-header-info">
            <div class="cw-avatar">🤖</div>
            <div>
              <div class="cw-agent-name">${isNav ? 'Asistente DatosParaTodos' : 'Experto en datos'}</div>
              <div class="cw-agent-status"><span class="cw-status-dot"></span> En línea</div>
            </div>
          </div>
          <button class="cw-close" onclick="ChatWidget.toggle()" aria-label="Cerrar chat">✕</button>
        </div>

        <div class="cw-messages" id="cwMessages"></div>

        <div class="cw-footer">
          <div class="cw-input-row">
            <textarea
              class="cw-input"
              id="cwInput"
              placeholder="${isNav ? '¿Qué información buscas?' : '¿Qué quieres saber sobre estos datos?'}"
              rows="1"
              onkeydown="ChatWidget._handleKey(event)"
              oninput="ChatWidget._autoResize(this)"
              disabled
            ></textarea>
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
        if (panel) panel.classList.toggle('cw-open', isOpen);
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

    function _hideTyping() {
        document.getElementById('cwTyping')?.remove();
    }

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

    // ── STYLES ────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('cw-styles')) return;
        const style = document.createElement('style');
        style.id = 'cw-styles';
        style.textContent = `
      /* ── TRIGGER BUTTON ── */
      .cw-trigger {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px 12px 14px;
        background: #0d2240;
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        box-shadow: 0 4px 24px rgba(13,34,64,0.45);
        transition: all 0.25s cubic-bezier(.175,.885,.32,1.275);
      }
      .cw-trigger:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(13,34,64,0.5);
      }
      .cw-trigger.cw-active {
        background: #1f2937;
      }
      .cw-trigger-icon { font-size: 20px; }
      .cw-trigger-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 9px;
        height: 9px;
        background: #4ade80;
        border-radius: 50%;
        border: 2px solid #0d2240;
        animation: cw-pulse 2s infinite;
      }
      .cw-trigger.cw-active .cw-trigger-dot { display: none; }

      /* ── PANEL ── */
      .cw-panel {
        position: fixed;
        bottom: 96px;
        right: 28px;
        z-index: 999;
        width: 380px;
        max-height: 560px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.92) translateY(16px);
        transform-origin: bottom right;
        opacity: 0;
        pointer-events: none;
        transition: all 0.28s cubic-bezier(.175,.885,.32,1.275);
        border: 1px solid rgba(0,0,0,0.06);
      }
      .cw-panel.cw-open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      /* ── HEADER ── */
      .cw-header {
        padding: 16px 20px;
        background: #0d2240;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .cw-header-info { display: flex; align-items: center; gap: 12px; }
      .cw-avatar {
        width: 38px; height: 38px;
        background: rgba(255,255,255,0.12);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
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
        background: rgba(255,255,255,0.1);
        border: none; color: rgba(255,255,255,0.7);
        width: 30px; height: 30px;
        border-radius: 50%; cursor: pointer;
        font-size: 13px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .cw-close:hover { background: rgba(255,255,255,0.2); color: white; }

      /* ── MESSAGES ── */
      .cw-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        scroll-behavior: smooth;
        background: #f9fafb;
      }
      .cw-messages::-webkit-scrollbar { width: 4px; }
      .cw-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

      .cw-message {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        animation: cw-fadeUp 0.25s ease;
      }
      .cw-message-user { flex-direction: row-reverse; }
      .cw-msg-avatar {
        width: 28px; height: 28px;
        background: #e5e7eb; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0;
      }

      .cw-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 13.5px;
        line-height: 1.55;
        font-family: 'DM Sans', sans-serif;
      }
      .cw-message-agent .cw-bubble {
        background: white;
        color: #1f2937;
        border-radius: 4px 16px 16px 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        border: 1px solid #e5e7eb;
      }
      .cw-message-user .cw-bubble {
        background: #0d2240;
        color: white;
        border-radius: 16px 4px 16px 16px;
      }

      /* ── TYPING INDICATOR ── */
      .cw-typing {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 12px 16px;
      }
      .cw-typing span {
        width: 7px; height: 7px;
        background: #9ca3af;
        border-radius: 50%;
        animation: cw-bounce 1.2s infinite ease-in-out;
      }
      .cw-typing span:nth-child(2) { animation-delay: 0.15s; }
      .cw-typing span:nth-child(3) { animation-delay: 0.3s; }

      /* ── FOOTER ── */
      .cw-footer {
        padding: 12px 14px 14px;
        border-top: 1px solid #f3f4f6;
        background: white;
        flex-shrink: 0;
      }
      .cw-input-row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .cw-input {
        flex: 1;
        padding: 10px 14px;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        font-size: 13.5px;
        font-family: 'DM Sans', sans-serif;
        color: #1f2937;
        resize: none;
        outline: none;
        line-height: 1.5;
        transition: border-color 0.2s;
        max-height: 120px;
        overflow-y: auto;
      }
      .cw-input:focus { border-color: #0d2240; }
      .cw-input:disabled { background: #f9fafb; }
      .cw-input::placeholder { color: #9ca3af; }

      .cw-send {
        width: 40px; height: 40px;
        background: #0d2240;
        border: none;
        border-radius: 12px;
        color: white;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
      }
      .cw-send:hover { background: #1a3a6b; transform: scale(1.05); }
      .cw-send:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }

      .cw-hint {
        font-size: 10.5px;
        color: #9ca3af;
        margin-top: 6px;
        text-align: center;
        font-family: 'DM Sans', sans-serif;
      }
      .cw-hint kbd {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 3px;
        padding: 1px 4px;
        font-size: 10px;
        font-family: 'DM Mono', monospace;
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
        .cw-panel {
          width: calc(100vw - 24px);
          right: 12px;
          bottom: 80px;
        }
        .cw-trigger { right: 16px; bottom: 16px; }
      }
    `;
        document.head.appendChild(style);
    }

    // ── PUBLIC API ────────────────────────────────────────────
    return { init, toggle, sendMessage, destroy, _handleKey, _submitInput, _autoResize };
})();