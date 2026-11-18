const productoService = require('../services/producto.service');

async function listar(req, res, next) {
  try {
    const productos = await productoService.listarProductos({
      categoria: req.query.categoria
    });
    return res.status(200).json(productos);
  } catch (err) {
    return next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const producto = await productoService.obtenerProductoPorId(req.params.id);
    return res.status(200).json(producto);
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const creado = await productoService.crearProducto(req.body);
    return res.status(201).json(creado);
  } catch (err) {
    return next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const actualizado = await productoService.actualizarProducto(req.params.id, req.body);
    return res.status(200).json(actualizado);
  } catch (err) {
    return next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await productoService.eliminarProducto(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
