const authService = require('../services/auth.service');
const {
  registrarFalloLogin,
  limpiarIntentosLogin
} = require('../middlewares/rateLimit.middleware');

async function registrar(req, res, next) {
  try {
    const usuario = await authService.registrar(req.body);
    return res.status(201).json(usuario);
  } catch (err) {
    return next(err);
  }
}

async function iniciarSesion(req, res, next) {
  try {
    const respuesta = await authService.iniciarSesion(req.body);
    limpiarIntentosLogin(req);
    return res.status(200).json(respuesta);
  } catch (err) {
    if (err.status === 401) {
      registrarFalloLogin(req);
    }
    return next(err);
  }
}

async function obtenerPerfil(req, res, next) {
  try {
    const perfil = await authService.obtenerPerfilActual(req.usuario);
    return res.status(200).json(perfil);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  registrar,
  iniciarSesion,
  obtenerPerfil
};
