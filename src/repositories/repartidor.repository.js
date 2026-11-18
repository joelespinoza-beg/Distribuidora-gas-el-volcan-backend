const { esModoPostgres, obtenerPool, obtenerMemoryStore } = require('../config/db');

async function listar() {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, nombre, telefono, activo FROM repartidores WHERE activo = TRUE ORDER BY id ASC'
    );
    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      telefono: r.telefono,
      activo: Boolean(r.activo)
    }));
  }

  return obtenerMemoryStore().repartidores.map((r) => ({ ...r }));
}

async function buscarPorId(id) {
  const codigo = String(id || '').trim().toUpperCase();
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, nombre, telefono, activo FROM repartidores WHERE UPPER(id) = $1 LIMIT 1',
      [codigo]
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      nombre: rows[0].nombre,
      telefono: rows[0].telefono,
      activo: Boolean(rows[0].activo)
    };
  }

  const encontrado = obtenerMemoryStore().repartidores.find((r) => r.id.toUpperCase() === codigo);
  return encontrado ? { ...encontrado } : null;
}

module.exports = {
  listar,
  buscarPorId
};
