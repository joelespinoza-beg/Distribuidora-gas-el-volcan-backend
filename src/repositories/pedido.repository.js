const { esModoPostgres, obtenerPool, obtenerMemoryStore } = require('../config/db');

function formatearPedidoConDetalle(filaPedido, filasDetalle = []) {
  if (!filaPedido) return null;
  const productos = filasDetalle.map((d) => ({
    id: d.producto_id ?? d.id,
    nombre: d.nombre_producto ?? d.nombre,
    cantidad: Number(d.cantidad),
    precioUnitario: Number(d.precio_unitario ?? d.precioUnitario),
    subtotal: Number(d.subtotal ?? Number(d.cantidad) * Number(d.precio_unitario ?? d.precioUnitario))
  }));
  const primero = productos[0] || { id: null, nombre: '', cantidad: 0, precioUnitario: 0 };
  const cantidadTotal = productos.reduce((acc, item) => acc + item.cantidad, 0);

  return {
    id: Number(filaPedido.id),
    usuarioId: filaPedido.usuario_id !== undefined ? filaPedido.usuario_id : filaPedido.usuarioId ?? null,
    cliente: filaPedido.cliente,
    email: filaPedido.email ?? null,
    telefono: filaPedido.telefono,
    direccion: filaPedido.direccion,
    zona: filaPedido.zona,
    tipoCliente: filaPedido.tipo_cliente ?? filaPedido.tipoCliente ?? 'residencial',
    productos,
    producto: { id: primero.id, nombre: primero.nombre },
    cantidad: cantidadTotal,
    precioUnitario: primero.precioUnitario,
    total: Number(filaPedido.total),
    metodoPago: filaPedido.metodo_pago ?? filaPedido.metodoPago ?? 'efectivo al recibir',
    estado: filaPedido.estado,
    repartidorId: filaPedido.repartidor_id !== undefined ? filaPedido.repartidor_id : filaPedido.repartidorId ?? null,
    hora: filaPedido.hora,
    creadoEn: filaPedido.creado_en ?? filaPedido.creadoEn
  };
}

async function listar() {
  if (esModoPostgres()) {
    const pool = obtenerPool();
    const { rows: pedidosRows } = await pool.query(
      'SELECT * FROM pedidos ORDER BY id ASC'
    );
    const { rows: detallesRows } = await pool.query(
      'SELECT * FROM detalle_pedidos ORDER BY id ASC'
    );
    return pedidosRows.map((p) => {
      const detalles = detallesRows.filter((d) => Number(d.pedido_id) === Number(p.id));
      return formatearPedidoConDetalle(p, detalles);
    });
  }

  return obtenerMemoryStore().pedidos.map((p) => ({
    ...p,
    productos: p.productos.map((item) => ({ ...item })),
    producto: { ...p.producto }
  }));
}

async function buscarPorId(id) {
  const numId = Number(id);
  if (Number.isNaN(numId)) return null;

  if (esModoPostgres()) {
    const pool = obtenerPool();
    const { rows: pedidosRows } = await pool.query(
      'SELECT * FROM pedidos WHERE id = $1 LIMIT 1',
      [numId]
    );
    if (!pedidosRows[0]) return null;
    const { rows: detallesRows } = await pool.query(
      'SELECT * FROM detalle_pedidos WHERE pedido_id = $1 ORDER BY id ASC',
      [numId]
    );
    return formatearPedidoConDetalle(pedidosRows[0], detallesRows);
  }

  const encontrado = obtenerMemoryStore().pedidos.find((p) => Number(p.id) === numId);
  if (!encontrado) return null;
  return {
    ...encontrado,
    productos: encontrado.productos.map((item) => ({ ...item })),
    producto: { ...encontrado.producto }
  };
}

async function crearConDescuentoStock({
  usuarioId,
  cliente,
  email,
  telefono,
  direccion,
  zona,
  tipoCliente,
  metodoPago,
  lineasCalculadas,
  total,
  hora
}) {
  if (esModoPostgres()) {
    const client = await obtenerPool().connect();
    try {
      await client.query('BEGIN');

      const { rows: pedidoRows } = await client.query(
        `INSERT INTO pedidos (usuario_id, cliente, email, telefono, direccion, zona, tipo_cliente, total, metodo_pago, estado, repartidor_id, hora)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente', NULL, $10)
         RETURNING *`,
        [usuarioId, cliente, email, telefono, direccion, zona, tipoCliente, total, metodoPago, hora]
      );
      const pedidoCreado = pedidoRows[0];
      const detallesInsertados = [];

      for (const linea of lineasCalculadas) {
        const { rows: detRows } = await client.query(
          `INSERT INTO detalle_pedidos (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [pedidoCreado.id, linea.id, linea.nombre, linea.cantidad, linea.precioUnitario, linea.subtotal]
        );
        detallesInsertados.push(detRows[0]);

        await client.query(
          'UPDATE productos SET stock = stock - $2 WHERE UPPER(id) = $1',
          [linea.id.toUpperCase(), linea.cantidad]
        );
      }

      await client.query('COMMIT');
      return formatearPedidoConDetalle(pedidoCreado, detallesInsertados);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Modo en memoria (atómico)
  const store = obtenerMemoryStore();
  for (const linea of lineasCalculadas) {
    const prod = store.productos.find((p) => p.id.toUpperCase() === linea.id.toUpperCase());
    prod.stock -= linea.cantidad;
  }

  const nuevoId = Math.max(0, ...store.pedidos.map((p) => Number(p.id))) + 1;
  const primero = lineasCalculadas[0];
  const cantidadTotal = lineasCalculadas.reduce((acc, item) => acc + item.cantidad, 0);

  const nuevoPedido = {
    id: nuevoId,
    usuarioId: usuarioId ?? null,
    cliente,
    email,
    telefono,
    direccion,
    zona,
    tipoCliente,
    productos: lineasCalculadas.map((l) => ({ ...l })),
    producto: { id: primero.id, nombre: primero.nombre },
    cantidad: cantidadTotal,
    precioUnitario: primero.precioUnitario,
    total,
    metodoPago,
    estado: 'pendiente',
    repartidorId: null,
    hora,
    creadoEn: new Date().toISOString()
  };

  store.pedidos.push(nuevoPedido);
  return { ...nuevoPedido };
}

async function actualizar(id, cambios) {
  const numId = Number(id);
  const actual = await buscarPorId(numId);
  if (!actual) return null;

  const nuevoEstado = cambios.estado !== undefined ? cambios.estado : actual.estado;
  const nuevoRepartidor = cambios.repartidorId !== undefined ? cambios.repartidorId : actual.repartidorId;

  if (esModoPostgres()) {
    const pool = obtenerPool();
    const { rows } = await pool.query(
      `UPDATE pedidos
       SET estado = $2,
           repartidor_id = $3
       WHERE id = $1
       RETURNING *`,
      [numId, nuevoEstado, nuevoRepartidor]
    );
    const { rows: detallesRows } = await pool.query(
      'SELECT * FROM detalle_pedidos WHERE pedido_id = $1 ORDER BY id ASC',
      [numId]
    );
    return formatearPedidoConDetalle(rows[0], detallesRows);
  }

  const store = obtenerMemoryStore();
  const idx = store.pedidos.findIndex((p) => Number(p.id) === numId);
  if (idx === -1) return null;
  store.pedidos[idx] = {
    ...store.pedidos[idx],
    estado: nuevoEstado,
    repartidorId: nuevoRepartidor
  };
  return { ...store.pedidos[idx] };
}

module.exports = {
  listar,
  buscarPorId,
  crearConDescuentoStock,
  actualizar
};
