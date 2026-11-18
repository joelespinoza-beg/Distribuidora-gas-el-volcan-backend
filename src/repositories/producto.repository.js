const { esModoPostgres, obtenerPool, obtenerMemoryStore } = require('../config/db');

function mapearFilaProducto(row) {
  if (!row) return null;
  return {
    id: row.id,
    categoria: row.categoria,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    unidad: row.unidad ?? 'Unidad',
    precioResidencial: Number(row.precio_residencial ?? row.precioResidencial),
    precioComercial: Number(row.precio_comercial ?? row.precioComercial),
    stock: Number(row.stock)
  };
}

async function listar() {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, categoria, nombre, descripcion, unidad, precio_residencial, precio_comercial, stock FROM productos WHERE activo = TRUE ORDER BY id ASC'
    );
    return rows.map(mapearFilaProducto);
  }

  return obtenerMemoryStore().productos.map((p) => ({ ...p }));
}

async function buscarPorId(id) {
  const codigo = String(id || '').trim().toUpperCase();
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, categoria, nombre, descripcion, unidad, precio_residencial, precio_comercial, stock FROM productos WHERE UPPER(id) = $1 AND activo = TRUE LIMIT 1',
      [codigo]
    );
    return mapearFilaProducto(rows[0]);
  }

  const encontrado = obtenerMemoryStore().productos.find((p) => p.id.toUpperCase() === codigo);
  return encontrado ? { ...encontrado } : null;
}

async function crear(datos) {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      `INSERT INTO productos (id, categoria, nombre, descripcion, unidad, precio_residencial, precio_comercial, stock, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id, categoria, nombre, descripcion, unidad, precio_residencial, precio_comercial, stock`,
      [
        datos.id,
        datos.categoria,
        datos.nombre,
        datos.descripcion || '',
        datos.unidad || 'Unidad',
        datos.precioResidencial,
        datos.precioComercial,
        datos.stock
      ]
    );
    return mapearFilaProducto(rows[0]);
  }

  const nuevo = {
    id: datos.id,
    categoria: datos.categoria,
    nombre: datos.nombre,
    descripcion: datos.descripcion || '',
    unidad: datos.unidad || 'Unidad',
    precioResidencial: Number(datos.precioResidencial),
    precioComercial: Number(datos.precioComercial),
    stock: Number(datos.stock)
  };
  obtenerMemoryStore().productos.push(nuevo);
  return { ...nuevo };
}

async function actualizar(id, cambios) {
  const actual = await buscarPorId(id);
  if (!actual) return null;

  const fusionado = {
    ...actual,
    ...cambios,
    id: actual.id
  };

  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      `UPDATE productos
       SET categoria = $2,
           nombre = $3,
           descripcion = $4,
           unidad = $5,
           precio_residencial = $6,
           precio_comercial = $7,
           stock = $8
       WHERE UPPER(id) = $1
       RETURNING id, categoria, nombre, descripcion, unidad, precio_residencial, precio_comercial, stock`,
      [
        actual.id.toUpperCase(),
        fusionado.categoria,
        fusionado.nombre,
        fusionado.descripcion,
        fusionado.unidad,
        fusionado.precioResidencial,
        fusionado.precioComercial,
        fusionado.stock
      ]
    );
    return mapearFilaProducto(rows[0]);
  }

  const store = obtenerMemoryStore();
  const idx = store.productos.findIndex((p) => p.id.toUpperCase() === actual.id.toUpperCase());
  if (idx === -1) return null;
  store.productos[idx] = { ...fusionado };
  return { ...store.productos[idx] };
}

async function tienePedidosAsociados(id) {
  const codigo = String(id || '').trim().toUpperCase();
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT COUNT(*)::int AS total FROM detalle_pedidos WHERE UPPER(producto_id) = $1',
      [codigo]
    );
    return rows[0].total > 0;
  }

  const store = obtenerMemoryStore();
  return store.pedidos.some((pedido) =>
    (pedido.productos || []).some((item) => String(item.id).toUpperCase() === codigo)
  );
}

async function eliminar(id) {
  const codigo = String(id || '').trim().toUpperCase();
  if (esModoPostgres()) {
    const { rowCount } = await obtenerPool().query(
      'DELETE FROM productos WHERE UPPER(id) = $1',
      [codigo]
    );
    return rowCount > 0;
  }

  const store = obtenerMemoryStore();
  const lenAntes = store.productos.length;
  store.productos = store.productos.filter((p) => p.id.toUpperCase() !== codigo);
  return store.productos.length < lenAntes;
}

module.exports = {
  listar,
  buscarPorId,
  crear,
  actualizar,
  tienePedidosAsociados,
  eliminar
};
