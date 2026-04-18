# GLITCHLAB v3.0

**Node.js + WebGL + TouchDesigner bridge**

---

## Setup

```bash
npm install
npm start
# → http://localhost:3000
```

---

## Estructura

```
glitchlab/
├── server/
│   └── index.js              ← Express + WebSocket HUB
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── core/
│       │   ├── perlin.js     ← Perlin noise
│       │   ├── state.js      ← Estado global
│       │   ├── lut-engine.js ← Motor LUT (presets + .cube)
│       │   ├── renderer.js   ← Pipeline CPU/WebGL/TD
│       │   ├── td-bridge.js  ← WS client → Node hub
│       │   └── app.js        ← Controlador, arranque
│       ├── effects/
│       │   ├── cpu-effects.js   ← 16 efectos CPU
│       │   ├── webgl-effects.js ← 5 shaders GLSL
│       │   └── td-effects.js   ← 5 efectos TD
│       ├── ui/
│       │   └── ui.js         ← Registry + builder de UI
│       └── webgl/
│           └── gl-renderer.js ← Motor WebGL2
└── td/
    └── glitchlab_bridge.py   ← Script Python para TouchDesigner
```

---

## TouchDesigner

El servidor Node actúa como **HUB bidireccional**:

```
TouchDesigner  ←──→  Node WS Hub (localhost:3000)  ←──→  Browser
```

TD se conecta a Node como **cliente** (no al revés).

### Setup en TD

1. Añade **WebSocket DAT**
2. Mode = **Client**, Network Address = `localhost`, Port = `3000`
3. En `onOpen` callback, envía identificación:

```python
dat.sendText('{"type":"identify","role":"td"}')
```

4. Luego envía parámetros cada frame desde un Execute DAT:

```python
import json
ws = op('websocket1')
if ws.isConnected:
    ws.sendText(json.dumps({
        "type": "params",
        "effect": "td_glitch",
        "values": {"amount": op('audio')['amp'][0]}
    }))
```

Ver `td/glitchlab_bridge.py` para ejemplos completos.

---

## Efectos TD disponibles

| ID               | Descripción           | Parámetros TD              |
|------------------|-----------------------|----------------------------|
| `td_colorgrade`  | Multiplicar RGB       | `r, g, b` (0.5–2.0)        |
| `td_warp`        | Desplazamiento pixel  | `dx, dy, strength` (–1..1) |
| `td_glitch`      | Glitch reactivo       | `amount` (0..1)            |
| `td_hue`         | Rotación de matiz     | `hue` (0..1 = 0..360°)     |
| `td_texture`     | Frame completo de TD  | (usar `send_texture()`)    |

---

## LUT

- Presets integrados: Fade, Neon, Vintage, Thermal, Acid
- Upload de archivos `.cube` (estándar 3D LUT)
- TD puede mandar LUTs via `{ type:'lut', data:... }`

---

## Atajos

| Tecla   | Acción            |
|---------|-------------------|
| `1`     | Calidad 25%       |
| `2`     | Calidad 50%       |
| `3`     | Calidad 100%      |
| `Ctrl+V`| Pegar imagen      |
| `Esc`   | Detener webcam    |
