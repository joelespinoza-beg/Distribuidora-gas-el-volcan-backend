const { esModoPostgres, obtenerPool, obtenerMemoryStore } = require('../config/db');

function mapearFilaUsuario(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    nombre: row.nombre,
    email: row.email,
    passwordHash: row.password_hash ?? row.passwordHash,
    rol: row.rol,
    repartidorCodigo: row.repartidor_codigo ?? row.repartidorCodigo ?? null,
    activo: row.activo !== undefined ? Boolean(row.activo) : true,
    creadoEn: row.creado_en ?? row.creadoEn
  };
}

async function buscarPorEmail(email) {
  const correo = String(email || '').trim().toLowerCase();
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en FROM usuarios WHERE LOWER(email) = $1 LIMIT 1',
      [correo]
    );
    return mapearFilaUsuario(rows[0]);
  }

  const store = obtenerMemoryStore();
  const encontrado = store.usuarios.find((u) => u.email.toLowerCase() === correo);
  return encontrado ? { ...encontrado } : null;
}

async function buscarPorId(id) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en FROM usuarios WHERE id = $1 LIMIT 1',
      [numId]
    );
    return mapearFilaUsuario(rows[0]);
  }

  const store = obtenerMemoryStore();
  const encontrado = store.usuarios.find((u) => Number(u.id) === numId);
  return encontrado ? { ...encontrado } : null;
}

async function crear({ nombre, email, passwordHash, rol = 'CLIENTE', repartidorCodigo = null }) {
  const correo = String(email).trim().toLowerCase();
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, repartidor_codigo, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en`,
      [nombre, correo, passwordHash, rol, repartidorCodigo]
    );
    return mapearFilaUsuario(rows[0]);
  }

  const store = obtenerMemoryStore();
  const nuevoId = Math.max(0, ...store.usuarios.map((u) => Number(u.id))) + 1;
  const nuevo = {
    id: nuevoId,
    nombre,
    email: correo,
    passwordHash,
    rol,
    repartidorCodigo,
    activo: true,
    creadoEn: new Date().toISOString()
  };
  store.usuarios.push(nuevo);
  return { ...nuevo };
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  crear
};
