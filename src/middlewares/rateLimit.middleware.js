// Control previsto en Guía 19 (Paso 6.4): Límite de intentos de login contra ataques de fuerza bruta
const registroIntentos = new Map();

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

function obtenerClaveCliente(req) {
  const ip = req.ip || req.connection?.remoteAddress || 'local';
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `${ip}:${email}`;
}

function verificarLimiteLogin(req, res, next) {
  const clave = obtenerClaveCliente(req);
  const ahora = Date.now();
  const registro = registroIntentos.get(clave);

  if (registro) {
    if (ahora - registro.primerIntento > VENTANA_MS) {
      registroIntentos.delete(clave);
    } else if (registro.contador >= MAX_INTENTOS) {
      return res.status(429).json({
        error: 'Demasiados intentos fallidos de inicio de sesión. Intenta nuevamente más tarde.'
      });
    }
  }

  return next();
}

function registrarFalloLogin(req) {
  const clave = obtenerClaveCliente(req);
  const ahora = Date.now();
  const actual = registroIntentos.get(clave);

  if (!actual || ahora - actual.primerIntento > VENTANA_MS) {
    registroIntentos.set(clave, { contador: 1, primerIntento: ahora });
  } else {
    actual.contador += 1;
  }
}

function limpiarIntentosLogin(req) {
  const clave = obtenerClaveCliente(req);
  registroIntentos.delete(clave);
}

function reiniciarLimitador() {
  registroIntentos.clear();
}

module.exports = {
  verificarLimiteLogin,
  registrarFalloLogin,
  limpiarIntentosLogin,
  reiniciarLimitador
};
