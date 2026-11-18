const clienteRepository = require('../repositories/cliente.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const { validarEntradaCliente } = require('../models/validators');

function crearError(status, message, detalles = null) {
  const error = new Error(message);
  error.status = status;
  if (detalles) error.detalles = detalles;
  return error;
}

function validar(validacion) {
  if (!validacion.esValido) {
    throw crearError(400, 'Datos de cliente inválidos', validacion.errores);
  }
  return validacion.datos;
}

function validarId(id) {
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId) || clienteId < 1) {
    throw crearError(400, 'El id de cliente debe ser un entero positivo');
  }
  return clienteId;
}

function puedeAdministrar(actor) {
  return actor.rol === 'ADMIN';
}

async function obtenerClienteAutorizado(id, actor) {
  const cliente = await clienteRepository.buscarPorId(validarId(id));
  if (!cliente) throw crearError(404, 'No se encontró el cliente');
  if (!puedeAdministrar(actor) &&
      (actor.rol !== 'CLIENTE' || Number(actor.id) !== Number(cliente.usuarioId))) {
    throw crearError(403, 'No puedes acceder al perfil de otro cliente');
  }
  return cliente;
}

async function listarClientes() {
  return clienteRepository.listar();
}

async function obtenerCliente(id, actor) {
  return obtenerClienteAutorizado(id, actor);
}

async function obtenerMiCliente(actor) {
  if (actor.rol !== 'CLIENTE') {
    throw crearError(403, 'Solo un usuario CLIENTE puede consultar su perfil por esta ruta');
  }
  const cliente = await clienteRepository.buscarPorUsuarioId(actor.id);
  if (!cliente) throw crearError(404, 'La cuenta no tiene un perfil de cliente');
  return cliente;
}

async function actualizarMiCliente(body, actor) {
  const cliente = await obtenerMiCliente(actor);
  const cambios = validar(validarEntradaCliente(body, true));
  const actualizado = await clienteRepository.actualizar(cliente.id, cambios);
  if (!actualizado) throw crearError(404, 'No se encontró el cliente');
  return actualizado;
}

async function crearCliente(body) {
  const datos = validar(validarEntradaCliente(body));
  if (datos.usuarioId !== undefined) {
    const usuario = await usuarioRepository.buscarPorId(datos.usuarioId);
    if (!usuario || usuario.rol !== 'CLIENTE' || !usuario.activo) {
      throw crearError(400, 'El usuario asociado debe existir, estar activo y tener rol CLIENTE');
    }
    if (await clienteRepository.buscarPorUsuarioId(usuario.id)) {
      throw crearError(409, 'El usuario ya tiene un perfil de cliente');
    }
  }
  return clienteRepository.crear(datos);
}

async function actualizarCliente(id, body, actor) {
  const cliente = await obtenerClienteAutorizado(id, actor);
  const cambios = validar(validarEntradaCliente(body, true));
  const actualizado = await clienteRepository.actualizar(cliente.id, cambios);
  if (!actualizado) throw crearError(404, 'No se encontró el cliente');
  return actualizado;
}

async function eliminarCliente(id) {
  const clienteId = validarId(id);
  if (!(await clienteRepository.eliminar(clienteId))) {
    throw crearError(404, 'No se encontró el cliente');
  }
}

module.exports = {
  listarClientes,
  obtenerCliente,
  obtenerMiCliente,
  actualizarMiCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente
};
