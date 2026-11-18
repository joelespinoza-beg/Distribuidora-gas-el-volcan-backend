const productoRepository = require('../repositories/producto.repository');
const { validarEntradaProducto } = require('../models/validators');

function crearError(status, message, detalles = null) {
  const err = new Error(message);
  err.status = status;
  if (detalles) err.detalles = detalles;
  return err;
}

async function listarProductos(filtros = {}) {
  const lista = await productoRepository.listar();
  if (filtros.categoria) {
    const cat = String(filtros.categoria).trim().toLowerCase();
    return lista.filter((p) => p.categoria.toLowerCase() === cat);
  }
  return lista;
}

async function obtenerProductoPorId(id) {
  const producto = await productoRepository.buscarPorId(id);
  if (!producto) {
    throw crearError(404, `No se encontró el producto con código ${id}`);
  }
  return producto;
}

async function crearProducto(body) {
  const validacion = validarEntradaProducto(body, false);
  if (!validacion.esValido) {
    throw crearError(400, 'Datos del producto inválidos', validacion.errores);
  }

  const { datos } = validacion;
  const existente = await productoRepository.buscarPorId(datos.id);
  if (existente) {
    throw crearError(409, `Ya existe un producto con el código ${datos.id}`);
  }

  return productoRepository.crear(datos);
}

async function actualizarProducto(id, body) {
  const actual = await productoRepository.buscarPorId(id);
  if (!actual) {
    throw crearError(404, `No se encontró el producto con código ${id}`);
  }

  const validacion = validarEntradaProducto(body, true);
  if (!validacion.esValido) {
    throw crearError(400, 'Datos de actualización inválidos', validacion.errores);
  }

  return productoRepository.actualizar(actual.id, validacion.datos);
}

async function eliminarProducto(id) {
  const actual = await productoRepository.buscarPorId(id);
  if (!actual) {
    throw crearError(404, `No se encontró el producto con código ${id}`);
  }

  // Regla de integridad (Guía 19 Paso 3.4): impedir eliminar un producto con pedidos históricos
  const enUso = await productoRepository.tienePedidosAsociados(actual.id);
  if (enUso) {
    throw crearError(
      409,
      `No se puede eliminar el producto ${actual.id} porque tiene pedidos históricos asociados`
    );
  }

  await productoRepository.eliminar(actual.id);
}

module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto
};
