const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuario.repository');
const { SALT_ROUNDS } = require('../config/seedData');
const { obtenerConfiguracionJwt } = require('../middlewares/auth.middleware');
const {
  sanitizarUsuarioSalida,
  validarEntradaRegistro,
  validarEntradaLogin
} = require('../models/validators');

function crearError(status, message, detalles = null) {
  const err = new Error(message);
  err.status = status;
  if (detalles) err.detalles = detalles;
  return err;
}

async function registrar(body) {
  const validacion = validarEntradaRegistro(body);
  if (!validacion.esValido) {
    throw crearError(400, 'Datos de registro inválidos', validacion.errores);
  }

  const { nombre, email, clave } = validacion.datos;
  const existente = await usuarioRepository.buscarPorEmail(email);
  if (existente) {
    throw crearError(409, 'Ya existe una cuenta registrada con ese correo electrónico');
  }

  const passwordHash = await bcrypt.hash(clave, SALT_ROUNDS);

  // Regla de seguridad (Guía 19 Paso 6.1): el servidor asigna siempre el rol inicial CLIENTE.
  // Ningún usuario puede auto-asignarse ADMIN, OPERADORA ni REPARTIDOR en el registro público.
  const creado = await usuarioRepository.crear({
    nombre,
    email,
    passwordHash,
    rol: 'CLIENTE',
    repartidorCodigo: null
  });

  return sanitizarUsuarioSalida(creado);
}

async function iniciarSesion(body) {
  const validacion = validarEntradaLogin(body);
  if (!validacion.esValido) {
    throw crearError(400, 'Datos de inicio de sesión inválidos', validacion.errores);
  }

  const { email, clave } = validacion.datos;
  const usuario = await usuarioRepository.buscarPorEmail(email);

  // Regla de seguridad (Guía 19 Paso 6.1): mensaje genérico para no revelar si el correo existe
  if (!usuario || usuario.activo === false) {
    throw crearError(401, 'Credenciales inválidas');
  }

  const coincide = await bcrypt.compare(clave, usuario.passwordHash);
  if (!coincide) {
    throw crearError(401, 'Credenciales inválidas');
  }

  const jwtConfig = obtenerConfiguracionJwt();
  const payload = {
    email: usuario.email,
    rol: usuario.rol,
    ...(usuario.repartidorCodigo ? { repartidorCodigo: usuario.repartidorCodigo } : {})
  };

  const accessToken = jwt.sign(payload, jwtConfig.secret, {
    algorithm: jwtConfig.algorithm,
    subject: String(usuario.id),
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    expiresIn: jwtConfig.expiresInSeconds
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: jwtConfig.expiresInSeconds,
    usuario: sanitizarUsuarioSalida(usuario)
  };
}

async function obtenerPerfilActual(usuarioToken) {
  if (!usuarioToken || !usuarioToken.id) {
    throw crearError(401, 'No autenticado');
  }

  const usuario = await usuarioRepository.buscarPorId(usuarioToken.id);
  if (!usuario || usuario.activo === false) {
    throw crearError(401, 'La cuenta de usuario no existe o está deshabilitada');
  }

  return sanitizarUsuarioSalida(usuario);
}

module.exports = {
  registrar,
  iniciarSesion,
  obtenerPerfilActual
};
