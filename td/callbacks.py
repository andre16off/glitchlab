# glitchlab_callbacks.py
# Pega este script en el Text DAT que usas como Callbacks DAT
# del WebSocket DAT de TouchDesigner.
#
# WebSocket DAT settings:
#   Network Address : localhost
#   Port            : 3000
#   Protocol        : WebSocket
#   Active          : On
#   Callbacks DAT   : (este mismo DAT)

import json

def onConnect(dat):
	"""Se llama cuando TD conecta al hub de Node."""
	print('[GLITCHLAB] Conectado al hub Node.js')
	# Identificarse como TouchDesigner
	dat.sendText(json.dumps({
		'type': 'identify',
		'role': 'td'
	}))
	# Notificar en el textport
	ui.status = 'GLITCHLAB: TouchDesigner conectado'


def onDisconnect(dat):
	"""Se llama cuando se pierde la conexión."""
	print('[GLITCHLAB] Desconectado del hub')
	ui.status = 'GLITCHLAB: Desconectado'


def onReceiveText(dat, rowIndex, message):
	"""Mensajes entrantes desde el browser (via hub)."""
	try:
		msg = json.loads(message)
	except Exception:
		return

	t = msg.get('type')

	if t == 'pong':
		return  # keep-alive

	if t == 'browser_param':
		# El browser manda un parámetro a TD
		# Ejemplo: {"type":"browser_param","key":"quality","value":0.5}
		key = msg.get('key')
		val = msg.get('value')
		print(f'[GLITCHLAB] Browser → TD: {key} = {val}')
		# Aquí puedes mapear a un Custom Par o a un CHOP
		# Ejemplo: op('constant1').par.value0 = val

	elif t == 'pong':
		pass

	else:
		print(f'[GLITCHLAB] Mensaje del browser: {msg}')


def onReceiveBinary(dat, contents):
	pass

def onReceivePing(dat, contents):
	dat.sendPong(contents)

def onReceivePong(dat, contents):
	pass
