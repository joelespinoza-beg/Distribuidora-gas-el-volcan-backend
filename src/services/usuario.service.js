const bcrypt = require('bcryptjs');
const usuarioRepository = require('../repositories/usuario.repository');
const {
  sanitizarUsuarioSalida,
  validarActualizacionUsuario,
  validarCambioRol,
  validarEntradaUsuario
} = require('../models/validators');

function crearError(status, message, detalles = null) {
  const error = new Error(message);
  error.status = status;
  if (detalles) error.detalles = detalles;
  return error;
}

function validar(validacion) {
  if (!validacion.esValido) {
    throw crearError(400, 'Datos de usuario inválidos', validacion.errores);
  }
  return validacion.datos;
}

function validarId(id) {
  const usuarioId = Number(id);
  if (!Number.isInteger(usuarioId) || usuarioId < 1) {
    throw crearError(400, 'El id de usuario debe ser un entero positivo');
  }
  return usuarioId;
}

async function obtenerUsuarioAutorizado(id, actor) {
  const usuarioId = validarId(id);
  const usuario = await usuarioRepository.buscarPorId(usuarioId);
  if (!usuario) throw crearError(404, 'No se encontró el usuario');
  if (actor.rol !== 'ADMIN' && Number(actor.id) !== usuarioId) {
    throw crearError(403, 'No puedes consultar ni modificar la cuenta de otro usuario');
  }
  return usuario;
}

async function listarUsuarios() {
  const usuarios = await usuarioRepository.listar();
  return usuarios.map(sanitizarUsuarioSalida);
}

async function obtenerUsuario(id, actor) {
  const usuario = await obtenerUsuarioAutorizado(id, actor);
  return sanitizarUsuarioSalida(usuario);
}

async function listarRoles() {
  return usuarioRepository.listarRoles();
}

async function crearUsuario(body) {
  const datos = validar(validarEntradaUsuario(body));
  if (!(await usuarioRepository.existeRol(datos.rol))) {
    throw crearError(400, 'El rol solicitado no existe');
  }
  if (datos.rol === 'REPARTIDOR' &&
      !(await usuarioRepository.existeRepartidor(datos.repartidorCodigo))) {
    throw crearError(400, 'El código debe pertenecer a un repartidor activo');
  }
  if (await usuarioRepository.buscarPorEmail(datos.email)) {
    throw crearError(409, 'Ya existe una cuenta registrada con ese correo electrónico');
  }

  const usuario = await usuarioRepository.crear({
    nombre: datos.nombre,
    email: datos.email,
    passwordHash: await bcrypt.hash(datos.clave, 10),
    rol: datos.rol,
    repartidorCodigo: datos.repartidorCodigo,
    cliente: datos.cliente
  });
  return sanitizarUsuarioSalida(usuario);
}

async function actualizarUsuario(id, body, actor) {
  const usuario = await obtenerUsuarioAutorizado(id, actor);
  const datos = validar(validarActualizacionUsuario(body));
  const passwordHash = datos.clave === undefined
    ? undefined
    : await bcrypt.hash(datos.clave, 10);

  const actualizado = await usuarioRepository.actualizar(usuario.id, {
    nombre: datos.nombre,
    email: datos.email,
    passwordHash
  });
  if (!actualizado) throw crearError(404, 'No se encontró el usuario');
  return sanitizarUsuarioSalida(actualizado);
}

async function cambiarRol(id, body) {
  const usuarioId = validarId(id);
  const datos = validar(validarCambioRol(body));
  if (!(await usuarioRepository.existeRol(datos.rol))) {
    throw crearError(400, 'El rol solicitado no existe');
  }
  if (datos.rol === 'REPARTIDOR' &&
      !(await usuarioRepository.existeRepartidor(datos.repartidorCodigo))) {
    throw crearError(400, 'El código debe pertenecer a un repartidor activo');
  }

  const actualizado = await usuarioRepository.cambiarRol(
    usuarioId,
    datos.rol,
    datos.repartidorCodigo
  );
  if (!actualizado) throw crearError(404, 'No se encontró el usuario');
  return sanitizarUsuarioSalida(actualizado);
}

async function desactivarUsuario(id, actor) {
  const usuarioId = validarId(id);
  if (Number(actor.id) === usuarioId) {
    throw crearError(409, 'No puedes desactivar tu propia cuenta');
  }
  const desactivado = await usuarioRepository.desactivar(usuarioId);
  if (!desactivado) throw crearError(404, 'No se encontró el usuario');
  return sanitizarUsuarioSalida(desactivado);
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarRol,
  desactivarUsuario
};
