/**
 * td-bridge.js
 *
 * Connects this browser to the Node.js WS hub as role:'browser'.
 * The hub relays messages between TD and the browser.
 *
 * Fixed vs v1:
 *   - Reconnect only after clean close, not on every error tick
 *   - Exponential backoff (max 8s) so it doesn't spam
 *   - Better status UI updates
 *   - TDBridge.applyEffect() correctly calls eff.fn with tdValues
 */
const TDBridge = (() => {

  let ws            = null;
  let reconnectTimer = null;
  let retryDelay    = 1000;   // starts at 1s, doubles up to 8s
  let tdValues      = {};     // latest param values from TD

  // ── Connect to Node hub ──────────────────────────────────────
  function connect() {
    clearTimeout(reconnectTimer);

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}`;

    try {
      ws = new WebSocket(url);
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      retryDelay = 1000; // reset backoff on success
      ws.send(JSON.stringify({ type: 'identify', role: 'browser' }));
      console.log('[TDBridge] Connected to Node hub at', url);
    };

    ws.onmessage = evt => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }
      handleMessage(msg);
    };

    ws.onerror = () => {
      // onclose fires right after onerror, handle there
    };

    ws.onclose = () => {
      ws = null;
      setTDStatus(false);
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(), retryDelay);
    retryDelay = Math.min(retryDelay * 2, 8000);
  }

  // ── Handle incoming messages ─────────────────────────────────
  function handleMessage(msg) {
    switch (msg.type) {

      case 'td_status':
        setTDStatus(msg.connected);
        break;

      case 'params':
        // TD is sending live parameter values
        tdValues = msg.values || {};
        State.td.lastFrame = msg;

        // Auto-switch to the target TD effect if specified
        if (msg.effect && Effects.registry[msg.effect]) {
          if (State.activeEffect !== msg.effect) {
            App.selectEffect(msg.effect);
          }
        }
        updateLiveUI(tdValues);

        // Re-render immediately (non-anim effects won't update otherwise)
        const eff = Effects.registry[State.activeEffect];
        if (eff && eff.type === 'td' && !eff.anim) Renderer.renderFrame();
        break;

      case 'texture':
        // TD pushed a full image frame as base64
        if (msg.data) {
          const img = new Image();
          img.onload = () => {
            State.srcImg  = img;
            State.srcVid  = null;
            State.isVideo = false;
            State.isCam   = false;
            UI.showCanvas();
            Renderer.renderFrame();
          };
          img.src = msg.data;
        }
        break;

      case 'pong':
        break;

      default:
        // Unknown — log for debugging
        console.log('[TDBridge] Unhandled msg type:', msg.type, msg);
    }
  }

  // ── TD connection status UI ──────────────────────────────────
  function setTDStatus(connected) {
    State.td.connected = connected;

    const dot        = document.getElementById('td-dot');
    const statusText = document.getElementById('td-status-text');
    const badge      = document.getElementById('td-badge');
    const sideBadge  = document.getElementById('td-sidebar-badge');

    if (connected) {
      dot.classList.add('on');
      statusText.textContent = 'TouchDesigner conectado';
      badge.style.display = 'inline';
      sideBadge.textContent = 'ON';
      sideBadge.classList.add('active');
    } else {
      dot.classList.remove('on');
      statusText.textContent = 'Desconectado — esperando TD...';
      badge.style.display = 'none';
      sideBadge.textContent = 'OFF';
      sideBadge.classList.remove('active');
    }
  }

  // ── Live param display ───────────────────────────────────────
  function updateLiveUI(values) {
    const el = document.getElementById('td-params-live');
    if (!el) return;
    const entries = Object.entries(values);
    if (!entries.length) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = entries
      .map(([k, v]) =>
        `<span style="color:#555">${k}</span> ` +
        `<span style="color:#ff9500">${typeof v === 'number' ? v.toFixed(3) : v}</span>`
      ).join('<br>');
  }

  // ── Called by Renderer for type:'td' effects ─────────────────
  function applyEffect(eff, imageData, w, h) {
    if (typeof eff.fn === 'function') {
      return eff.fn(imageData, w, h, tdValues);
    }
    return imageData;
  }

  // ── Send a message TO TD (via hub) ───────────────────────────
  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    } else {
      console.warn('[TDBridge] Cannot send — not connected');
    }
  }

  function reconnect() {
    if (ws) { ws.close(); ws = null; }
    retryDelay = 1000;
    connect();
  }

  function getValues() { return tdValues; }
  function isConnected() { return ws && ws.readyState === WebSocket.OPEN; }

  // Auto-connect on load
  connect();

  return { send, reconnect, applyEffect, getValues, isConnected };
})();
