# send_params.py
# Pon esto en un Script DAT o en un Execute DAT (Frame Start).
# Ajusta los nombres de operadores a tu red de TD.
#
# Este script envía datos al browser cada frame:
#   - Parámetros de control (CHOPs → effect params)
#   - Frames de textura (TOP → imagen en el browser)

import json, base64

# ── Referencia al WebSocket DAT ───────────────────────────────
WS = op('websocket1')   # cambia esto al nombre de tu WebSocket DAT


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def send(msg: dict):
	"""Envía un dict como JSON al hub (→ browser)."""
	if WS.isConnected:
		WS.sendText(json.dumps(msg))


def send_params(effect_id: str, values: dict):
	"""
	Envía parámetros de control al browser.
	El browser los aplica al efecto indicado en tiempo real.

	Args:
		effect_id : id del efecto en el registry del browser
		            ('td_colorgrade', 'td_glitch', 'td_warp', 'td_hue', etc.)
		values    : dict con los valores. Convención:
		            - Floats normalizados 0..1 salvo que se indique
		            - Nombres de parámetro en inglés (igual que en el registry)
	"""
	send({'type': 'params', 'effect': effect_id, 'values': values})


def send_texture(top_op, fmt='png', quality=85):
	"""
	Envía un frame completo de un TOP al browser como imagen base64.
	Úsalo con moderación — es costoso. Para streaming continuo
	usa send_params() + shaders en el browser.

	Args:
		top_op  : referencia al TOP  (ej. op('null1'))
		fmt     : 'png' o 'jpg'
		quality : calidad JPEG (solo si fmt='jpg')
	"""
	try:
		data = top_op.saveByteArray(fmt)
		b64  = base64.b64encode(data).decode('utf-8')
		send({
			'type': 'texture',
			'data': f'data:image/{fmt};base64,{b64}'
		})
	except Exception as e:
		print(f'[GLITCHLAB] Error enviando textura: {e}')


def send_lut(lut_top, size=32):
	"""
	Envía una LUT desde un TOP de TD al browser.
	El TOP debe ser un strip horizontal de size*size*size píxeles × 1 de alto.
	"""
	try:
		data = lut_top.saveByteArray('png')
		b64  = base64.b64encode(data).decode('utf-8')
		send({
			'type' : 'lut',
			'name' : lut_top.name,
			'size' : size,
			'data' : f'data:image/png;base64,{b64}'
		})
	except Exception as e:
		print(f'[GLITCHLAB] Error enviando LUT: {e}')


# ═══════════════════════════════════════════════════════════════
# EJEMPLOS DE USO  — descomenta lo que necesites
# ═══════════════════════════════════════════════════════════════

def run():
	"""
	Llama a esta función desde un Execute DAT (Frame Start).
	Personaliza con tus propios operadores.
	"""
	if not WS.isConnected:
		return

	# ── Ejemplo 1: Glitch reactivo con audio ─────────────────
	# Lee la amplitud de AudioDeviceIn y la manda como "amount"
	# try:
	# 	amp = op('audiodevicein1').chop['chan1'][0]
	# 	send_params('td_glitch', {'amount': float(amp)})
	# except:
	# 	pass

	# ── Ejemplo 2: Color grade desde un Color CHOP ───────────
	# try:
	# 	col = op('color1')
	# 	send_params('td_colorgrade', {
	# 		'r': float(col['r'][0]),
	# 		'g': float(col['g'][0]),
	# 		'b': float(col['b'][0]),
	# 	})
	# except:
	# 	pass

	# ── Ejemplo 3: Hue rotation desde un LFO ─────────────────
	# try:
	# 	hue = op('lfo1')['chan1'][0]   # 0..1
	# 	send_params('td_hue', {'hue': float(hue)})
	# except:
	# 	pass

	# ── Ejemplo 4: Warp con noise CHOP ───────────────────────
	# try:
	# 	nx = op('noise1')['tx'][0]     # -1..1
	# 	ny = op('noise1')['ty'][0]
	# 	send_params('td_warp', {
	# 		'dx':       float(nx),
	# 		'dy':       float(ny),
	# 		'strength': 0.5,
	# 	})
	# except:
	# 	pass

	# ── Ejemplo 5: Frame de textura (cada 30 frames) ─────────
	# if absFrame % 30 == 0:
	# 	send_texture(op('null_out'), fmt='jpg', quality=80)

	pass   # quita este pass cuando actives algún ejemplo


# ── Entry point para Execute DAT ──────────────────────────────
# En tu Execute DAT, en el callback "Frame Start":
#
#   import send_params as gl
#   gl.run()
#
# O si prefieres llamar directamente desde aquí:
# run()
