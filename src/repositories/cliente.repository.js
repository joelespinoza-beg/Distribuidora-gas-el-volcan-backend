const { esModoPostgres, obtenerPool, obtenerMemoryStore } = require('../config/db');

function mapearFilaCliente(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    usuarioId: row.usuario_id === null || row.usuario_id === undefined
      ? row.usuarioId ?? null
      : Number(row.usuario_id),
    nombre: row.nombre,
    telefono: row.telefono ?? null,
    direccion: row.direccion ?? null,
    tipoCliente: row.tipo_cliente ?? row.tipoCliente ?? 'residencial',
    activo: row.activo !== undefined ? Boolean(row.activo) : true,
    creadoEn: row.creado_en ?? row.creadoEn
  };
}

async function listar() {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, usuario_id, nombre, telefono, direccion, tipo_cliente, activo, creado_en FROM clientes ORDER BY id'
    );
    return rows.map(mapearFilaCliente);
  }
  return obtenerMemoryStore().clientes.map((cliente) => ({ ...cliente }));
}

async function buscarPorId(id) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, usuario_id, nombre, telefono, direccion, tipo_cliente, activo, creado_en FROM clientes WHERE id = $1 LIMIT 1',
      [numId]
    );
    return mapearFilaCliente(rows[0]);
  }
  const cliente = obtenerMemoryStore().clientes.find((item) => Number(item.id) === numId);
  return cliente ? { ...cliente } : null;
}

async function buscarPorUsuarioId(usuarioId) {
  const numId = Number(usuarioId);
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, usuario_id, nombre, telefono, direccion, tipo_cliente, activo, creado_en FROM clientes WHERE usuario_id = $1 LIMIT 1',
      [numId]
    );
    return mapearFilaCliente(rows[0]);
  }
  const cliente = obtenerMemoryStore().clientes.find(
    (item) => Number(item.usuarioId) === numId
  );
  return cliente ? { ...cliente } : null;
}

async function crear({ usuarioId = null, nombre, telefono = null, direccion = null, tipoCliente = 'residencial' }) {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      `INSERT INTO clientes (usuario_id, nombre, telefono, direccion, tipo_cliente)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, usuario_id, nombre, telefono, direccion, tipo_cliente, activo, creado_en`,
      [usuarioId, nombre, telefono, direccion, tipoCliente]
    );
    return mapearFilaCliente(rows[0]);
  }

  const store = obtenerMemoryStore();
  const id = Math.max(0, ...store.clientes.map((cliente) => Number(cliente.id))) + 1;
  const cliente = {
    id,
    usuarioId,
    nombre,
    telefono,
    direccion,
    tipoCliente,
    activo: true,
    creadoEn: new Date().toISOString()
  };
  store.clientes.push(cliente);
  return { ...cliente };
}

async function actualizar(id, cambios) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      `UPDATE clientes
       SET nombre = COALESCE($2, nombre),
           telefono = CASE WHEN $3::boolean THEN $4 ELSE telefono END,
           direccion = CASE WHEN $5::boolean THEN $6 ELSE direccion END,
           tipo_cliente = COALESCE($7, tipo_cliente)
       WHERE id = $1
       RETURNING id, usuario_id, nombre, telefono, direccion, tipo_cliente, activo, creado_en`,
      [
        numId,
        cambios.nombre ?? null,
        Object.hasOwn(cambios, 'telefono'),
        cambios.telefono ?? null,
        Object.hasOwn(cambios, 'direccion'),
        cambios.direccion ?? null,
        cambios.tipoCliente ?? null
      ]
    );
    return mapearFilaCliente(rows[0]);
  }

  const cliente = obtenerMemoryStore().clientes.find((item) => Number(item.id) === numId);
  if (!cliente) return null;
  for (const campo of ['nombre', 'telefono', 'direccion', 'tipoCliente']) {
    if (Object.hasOwn(cambios, campo)) cliente[campo] = cambios[campo];
  }
  return { ...cliente };
}

async function eliminar(id) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'DELETE FROM clientes WHERE id = $1 RETURNING id',
      [numId]
    );
    return rows.length > 0;
  }
  const store = obtenerMemoryStore();
  const index = store.clientes.findIndex((cliente) => Number(cliente.id) === numId);
  if (index < 0) return false;
  store.clientes.splice(index, 1);
  return true;
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorUsuarioId,
  crear,
  actualizar,
  eliminar
};
