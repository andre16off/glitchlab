# TouchDesigner → GLITCHLAB bridge
## Setup en 5 minutos

### Paso 1 — Arranca el servidor Node
```
cd glitchlab
npm start
```
Deberías ver: `→ App: http://localhost:3000`

### Paso 2 — Abre el browser
Ve a `http://localhost:3000`

### Paso 3 — Monta la red en TouchDesigner
Crea estos operadores en este orden:

```
[WebSocket DAT] → [Script DAT "glitchlab_send"]
      ↑
[Text DAT "glitchlab_callbacks"]
```

### Paso 4 — Configura el WebSocket DAT
- **Network Address:** `localhost`
- **Port:** `3000`
- **Protocol:** `WebSocket`
- **Active:** `On`
- En la pestaña **Callbacks DAT** → apunta a `glitchlab_callbacks`

### Paso 5 — Pega los scripts (ver archivos .py en esta carpeta)
- `callbacks.py` → en el Text DAT "glitchlab_callbacks"
- `send_params.py` → en el Script DAT "glitchlab_send"

### Paso 6 — Verifica
El badge "TD" en la barra superior del browser se pondrá en verde.
En la consola del browser verás: `[TDBridge] TD connected`
