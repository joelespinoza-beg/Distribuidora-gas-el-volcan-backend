const pedidoService = require('../services/pedido.service');

async function listar(req, res, next) {
  try {
    const pedidos = await pedidoService.listarPedidosSegunRol(req.usuario);
    return res.status(200).json(pedidos);
  } catch (err) {
    return next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const pedido = await pedidoService.obtenerPedidoPorIdSegunRol(req.params.id, req.usuario);
    return res.status(200).json(pedido);
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const pedido = await pedidoService.crearPedido(req.body, req.usuario);
    return res.status(201).json(pedido);
  } catch (err) {
    return next(err);
  }
}

async function asignarRepartidor(req, res, next) {
  try {
    const pedido = await pedidoService.asignarRepartidor(req.params.id, req.body?.repartidorId);
    return res.status(200).json(pedido);
  } catch (err) {
    return next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const pedido = await pedidoService.cambiarEstadoPedido(
      req.params.id,
      req.body?.estado,
      req.usuario
    );
    return res.status(200).json(pedido);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  asignarRepartidor,
  cambiarEstado
};
