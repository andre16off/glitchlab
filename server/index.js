/**
 * server/index.js — GLITCHLAB WebSocket Hub
 *
 * Acts as a relay between TouchDesigner and the browser.
 * Both connect here as clients — Node is the hub.
 *
 * TD       → identifies as role:'td'
 * Browser  → identifies as role:'browser'
 *
 * Any message from TD is forwarded to all browsers, and vice versa.
 */

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const path      = require('path');

const PORT = process.env.PORT || 3000;

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json({ limit: '50mb' })); // textures can be large

// ── Client registry ──────────────────────────────────────────
const clients = {
  browsers: new Set(),
  td:       new Set(),
};

function broadcast(targets, data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  targets.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  });
}

function notifyBrowsers(msg) { broadcast(clients.browsers, msg); }
function notifyTD(msg)       { broadcast(clients.td, msg); }

// ── WebSocket hub ─────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  let role = null;

  ws.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore non-JSON (TD sometimes sends plain text on connect)
    }

    // ── Identification handshake ──
    if (msg.type === 'identify') {
      role = msg.role; // 'browser' | 'td'

      if (role === 'td') {
        clients.td.add(ws);
        console.log(`[HUB] TouchDesigner connected  (${ip})  — TD clients: ${clients.td.size}`);
        // Tell all browsers TD is now online
        notifyBrowsers({ type: 'td_status', connected: true, count: clients.td.size });

      } else {
        clients.browsers.add(ws);
        console.log(`[HUB] Browser connected  (${ip})  — browsers: ${clients.browsers.size}`);
        // Tell this browser the current TD status immediately
        ws.send(JSON.stringify({
          type: 'td_status',
          connected: clients.td.size > 0,
          count: clients.td.size,
        }));
      }
      return;
    }

    // ── Keep-alive ──
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    // ── Route messages ──
    if (!role) return; // not identified yet

    if (role === 'td') {
      // TD → browser(s)
      msg._from = 'td';
      notifyBrowsers(msg);
      // Small log for params (not textures — too noisy)
      if (msg.type === 'params') {
        process.stdout.write(`[TD→Browser] effect:${msg.effect || '?'} keys:[${Object.keys(msg.values||{}).join(',')}]\r`);
      }

    } else {
      // browser → TD
      msg._from = 'browser';
      notifyTD(msg);
    }
  });

  ws.on('close', () => {
    const wasTD = clients.td.delete(ws);
    clients.browsers.delete(ws);

    if (wasTD) {
      console.log(`\n[HUB] TouchDesigner disconnected  — TD clients: ${clients.td.size}`);
      notifyBrowsers({ type: 'td_status', connected: clients.td.size > 0, count: clients.td.size });
    } else {
      console.log(`[HUB] Browser disconnected  — browsers: ${clients.browsers.size}`);
    }
  });

  ws.on('error', err => {
    console.warn('[HUB] WS error:', err.message);
  });
});

// ── REST: status ──────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    browsers: clients.browsers.size,
    td:       clients.td.size,
    uptime:   Math.round(process.uptime()),
  });
});

// ── Boot ──────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('');
  console.log('  ░█▀▀░█░░░▀█▀░▀█▀░█▀▀░█░█░█░░░█▀█░█▀▄');
  console.log('  ░█░█░█░░░░█░░░█░░█░░░█▀█░█░░░█▀█░█▀▄');
  console.log('  ░▀▀▀░▀▀▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀░');
  console.log('');
  console.log(`  App     →  http://localhost:${PORT}`);
  console.log(`  WS hub  →  ws://localhost:${PORT}`);
  console.log('');
  console.log('  TouchDesigner setup:');
  console.log('    WebSocket DAT → Client mode');
  console.log(`    Network Address: localhost   Port: ${PORT}`);
  console.log('    Callbacks DAT: see td/callbacks.py');
  console.log('');
  console.log('  Waiting for connections...');
  console.log('');
});
