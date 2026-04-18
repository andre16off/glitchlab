"""
td/glitchlab_bridge.py
======================
Pega esto en un Script DAT o en el callback onReceive de un WebSocket DAT.

SETUP EN TOUCHDESIGNER:
  1. Añade un WebSocket DAT al network
  2. Mode = Client (TD se conecta a Node como cliente)
  3. Network Address = localhost
  4. Port = 3000
  5. Abre este DAT → en onOpen envía el mensaje de identificación

El servidor Node actúa como HUB: TD y el browser se conectan los dos a él.
"""

import json

# ── onOpen (WebSocket DAT callback) ──────────────────────────
def onOpen(dat):
    """Identificarse ante el hub de Node como cliente TD."""
    dat.sendText(json.dumps({
        "type": "identify",
        "role": "td"
    }))
    print("[GLITCHLAB] Identificado como TouchDesigner")


# ── Helpers para enviar datos ─────────────────────────────────

def send_params(ws_dat, effect_id, values: dict):
    """
    Envía parámetros de control al browser.
    
    Args:
        ws_dat:    referencia al WebSocket DAT (op('websocket1'))
        effect_id: id del efecto en el registry ('td_colorgrade', 'td_glitch', etc.)
        values:    dict con valores CHOP normalizados
    
    Ejemplo:
        send_params(op('websocket1'), 'td_colorgrade', {
            'r': op('color')['r'][0],
            'g': op('color')['g'][0],
            'b': op('color')['b'][0],
        })
    """
    msg = json.dumps({
        "type":   "params",
        "effect": effect_id,
        "values": values
    })
    ws_dat.sendText(msg)


def send_texture(ws_dat, top_op, format='png'):
    """
    Envía un frame de textura completo desde un TOP al browser.
    Nota: para streaming continuo usa send_params con parámetros
    en vez de texturas — es mucho más eficiente.
    
    Args:
        ws_dat: WebSocket DAT
        top_op: referencia al TOP (op('null1'))
    """
    import base64
    data = top_op.saveByteArray(format)
    b64  = base64.b64encode(data).decode('utf-8')
    msg  = json.dumps({
        "type": "texture",
        "data": f"data:image/{format};base64,{b64}"
    })
    ws_dat.sendText(msg)


# ── Ejemplo: Execute DAT con timer ───────────────────────────
# Pega esto en un Execute DAT con "Frame Start" activado.
# Ajusta los nombres de operadores a tu red.

def on_frame_start():
    """Envía parámetros cada frame desde CHOPs de audio o LFO."""
    ws = op('websocket1')
    if not ws.isConnected:
        return

    # Ejemplo: controlar glitch reactivo con amplitud de audio
    audio_amp = op('audiodevicein1').chop['chan1'][0]  # 0..1
    send_params(ws, 'td_glitch', {
        'amount': audio_amp
    })

    # Ejemplo: rotar hue con LFO
    # hue_val = op('lfo1')['chan1'][0]  # 0..1
    # send_params(ws, 'td_hue', {'hue': hue_val})

    # Ejemplo: color grade desde Color CHOP
    # send_params(ws, 'td_colorgrade', {
    #     'r': op('color1')['r'][0],
    #     'g': op('color1')['g'][0],
    #     'b': op('color1')['b'][0],
    # })


# ── Efectos disponibles en el browser ────────────────────────
TD_EFFECTS = {
    'td_colorgrade': {
        'desc': 'Multiply RGB channels',
        'params': {'r': '0.5–2.0', 'g': '0.5–2.0', 'b': '0.5–2.0'}
    },
    'td_warp': {
        'desc': 'Pixel displacement',
        'params': {'dx': '-1..1', 'dy': '-1..1', 'strength': '0..1'}
    },
    'td_glitch': {
        'desc': 'Reactive scanline glitch',
        'params': {'amount': '0..1'}
    },
    'td_hue': {
        'desc': 'Hue rotation',
        'params': {'hue': '0..1 (=0..360°)'}
    },
    'td_texture': {
        'desc': 'Full frame texture push from TD',
        'params': {}  # use send_texture()
    },
}
