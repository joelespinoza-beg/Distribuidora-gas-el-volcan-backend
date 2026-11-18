const pedidoRepository = require('../repositories/pedido.repository');
const productoRepository = require('../repositories/producto.repository');
const repartidorRepository = require('../repositories/repartidor.repository');
const { ESTADOS_PEDIDO, validarEntradaPedido } = require('../models/validators');

function crearError(status, message, detalles = null) {
  const err = new Error(message);
  err.status = status;
  if (detalles) err.detalles = detalles;
  return err;
}

async function crearPedido(body, usuarioAutenticado) {
  const validacion = validarEntradaPedido(body);
  if (!validacion.esValido) {
    throw crearError(400, 'Datos del pedido inválidos', validacion.errores);
  }

  const { cliente, email, telefono, direccion, zona, tipoCliente, metodoPago, items } = validacion.datos;

  // Consolidar cantidades si el mismo código de producto se envió más de una vez
  const mapaCantidades = new Map();
  for (const item of items) {
    mapaCantidades.set(item.id, (mapaCantidades.get(item.id) || 0) + item.cantidad);
  }

  const lineasCalculadas = [];
  let totalServidor = 0;

  for (const [codigoProducto, cantidadSolicitada] of mapaCantidades.entries()) {
    const productoDb = await productoRepository.buscarPorId(codigoProducto);
    if (!productoDb) {
      throw crearError(404, `El producto con código ${codigoProducto} no existe en el catálogo`);
    }

    if (cantidadSolicitada > productoDb.stock) {
      throw crearError(
        409,
        `Stock insuficiente para ${productoDb.nombre} (disponible: ${productoDb.stock}, solicitado: ${cantidadSolicitada})`
      );
    }

    // Regla de negocio (Guía 19 Paso 4): el servidor calcula el precio unitario y el total
    // según el tipo de cliente (residencial o comercial), sin confiar en el precio enviado por React.
    const precioUnitario = tipoCliente === 'comercial'
      ? productoDb.precioComercial
      : productoDb.precioResidencial;
    const subtotal = precioUnitario * cantidadSolicitada;

    lineasCalculadas.push({
      id: productoDb.id,
      nombre: productoDb.nombre,
      cantidad: cantidadSolicitada,
      precioUnitario,
      subtotal
    });

    totalServidor += subtotal;
  }

  const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return pedidoRepository.crearConDescuentoStock({
    usuarioId: usuarioAutenticado.id,
    cliente,
    email: email || usuarioAutenticado.email,
    telefono,
    direccion,
    zona,
    tipoCliente,
    metodoPago,
    lineasCalculadas,
    total: totalServidor,
    hora
  });
}

async function listarPedidosSegunRol(usuarioAutenticado) {
  const todos = await pedidoRepository.listar();

  if (usuarioAutenticado.rol === 'ADMIN' || usuarioAutenticado.rol === 'OPERADORA') {
    return todos;
  }

  if (usuarioAutenticado.rol === 'REPARTIDOR') {
    return todos.filter(
      (p) => String(p.repartidorId || '').toUpperCase() === String(usuarioAutenticado.repartidorCodigo || '').toUpperCase()
    );
  }

  // Rol CLIENTE: solo puede ver los pedidos cuyo propietario es su propio usuarioId
  return todos.filter((p) => Number(p.usuarioId) === Number(usuarioAutenticado.id));
}

async function obtenerPedidoPorIdSegunRol(id, usuarioAutenticado) {
  const pedido = await pedidoRepository.buscarPorId(id);
  if (!pedido) {
    throw crearError(404, `No se encontró un pedido con el número ${id}`);
  }

  // Regla anti-IDOR (Guía 19 Paso 7): impedir consultar pedidos de otra persona cambiando el ID en la URL
  if (usuarioAutenticado.rol === 'CLIENTE' && Number(pedido.usuarioId) !== Number(usuarioAutenticado.id)) {
    throw crearError(403, 'Acceso denegado: no tienes permiso para consultar el pedido de otro cliente');
  }

  if (
    usuarioAutenticado.rol === 'REPARTIDOR' &&
    String(pedido.repartidorId || '').toUpperCase() !== String(usuarioAutenticado.repartidorCodigo || '').toUpperCase()
  ) {
    throw crearError(403, 'Acceso denegado: este pedido no está asignado a tu ruta de reparto');
  }

  return pedido;
}

async function asignarRepartidor(id, repartidorId) {
  const codigoRepartidor = String(repartidorId || '').trim().toUpperCase();
  if (!codigoRepartidor) {
    throw crearError(400, 'Debes indicar el identificador del repartidor (ej: R1)');
  }

  const pedido = await pedidoRepository.buscarPorId(id);
  if (!pedido) {
    throw crearError(404, `No se encontró un pedido con el número ${id}`);
  }

  if (pedido.estado === 'entregado') {
    throw crearError(409, 'No se puede reasignar un pedido que ya fue entregado');
  }

  const repartidor = await repartidorRepository.buscarPorId(codigoRepartidor);
  if (!repartidor) {
    throw crearError(404, `No existe el repartidor con código ${codigoRepartidor}`);
  }

  return pedidoRepository.actualizar(pedido.id, {
    repartidorId: repartidor.id,
    estado: 'asignado'
  });
}

async function cambiarEstadoPedido(id, nuevoEstado, usuarioAutenticado) {
  const estadoNormalizado = String(nuevoEstado || '').trim().toLowerCase();
  if (!ESTADOS_PEDIDO.includes(estadoNormalizado)) {
    throw crearError(
      400,
      `Estado inválido. Los estados permitidos son: ${ESTADOS_PEDIDO.join(', ')}`
    );
  }

  const pedido = await pedidoRepository.buscarPorId(id);
  if (!pedido) {
    throw crearError(404, `No se encontró un pedido con el número ${id}`);
  }

  // Regla de propiedad y rol para REPARTIDOR
  if (usuarioAutenticado.rol === 'REPARTIDOR') {
    if (String(pedido.repartidorId || '').toUpperCase() !== String(usuarioAutenticado.repartidorCodigo || '').toUpperCase()) {
      throw crearError(403, 'Acceso denegado: solo puedes actualizar entregas asignadas a ti');
    }
    if (!['en_camino', 'entregado'].includes(estadoNormalizado)) {
      throw crearError(403, 'El repartidor solo puede marcar un pedido como en_camino o entregado');
    }
  }

  return pedidoRepository.actualizar(pedido.id, {
    estado: estadoNormalizado
  });
}

module.exports = {
  crearPedido,
  listarPedidosSegunRol,
  obtenerPedidoPorIdSegunRol,
  asignarRepartidor,
  cambiarEstadoPedido
};
