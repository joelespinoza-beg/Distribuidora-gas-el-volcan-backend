const clienteService = require('../services/cliente.service');

async function listar(req, res, next) {
  try {
    return res.status(200).json(await clienteService.listarClientes());
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    return res.status(200).json(
      await clienteService.obtenerCliente(req.params.id, req.usuario)
    );
  } catch (error) {
    return next(error);
  }
}

async function obtenerMio(req, res, next) {
  try {
    return res.status(200).json(await clienteService.obtenerMiCliente(req.usuario));
  } catch (error) {
    return next(error);
  }
}

async function actualizarMio(req, res, next) {
  try {
    return res.status(200).json(
      await clienteService.actualizarMiCliente(req.body, req.usuario)
    );
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    return res.status(201).json(await clienteService.crearCliente(req.body));
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    return res.status(200).json(
      await clienteService.actualizarCliente(req.params.id, req.body, req.usuario)
    );
  } catch (error) {
    return next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await clienteService.eliminarCliente(req.params.id);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerMio,
  actualizarMio,
  crear,
  actualizar,
  eliminar
};
