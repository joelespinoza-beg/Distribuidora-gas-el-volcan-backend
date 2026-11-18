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

function crearError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
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

  const encontrado = obtenerMemoryStore().usuarios.find((u) => Number(u.id) === numId);
  return encontrado ? { ...encontrado } : null;
}

async function listar() {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      'SELECT id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en FROM usuarios ORDER BY id'
    );
    return rows.map(mapearFilaUsuario);
  }

  return obtenerMemoryStore().usuarios.map((usuario) => ({ ...usuario }));
}

async function existeRepartidor(codigo) {
  if (!codigo) return false;
  if (esModoPostgres()) {
    const { rowCount } = await obtenerPool().query(
      'SELECT 1 FROM repartidores WHERE id = $1 AND activo = TRUE',
      [codigo]
    );
    return rowCount > 0;
  }

  return obtenerMemoryStore().repartidores.some(
    (repartidor) => repartidor.id === codigo && repartidor.activo
  );
}

async function crear({
  nombre,
  email,
  passwordHash,
  rol = 'CLIENTE',
  repartidorCodigo = null,
  cliente = {}
}) {
  const correo = String(email).trim().toLowerCase();
  if (esModoPostgres()) {
    const pool = obtenerPool();
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const { rows } = await connection.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, repartidor_codigo, activo)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en`,
        [nombre, correo, passwordHash, rol, repartidorCodigo]
      );
      const usuario = mapearFilaUsuario(rows[0]);

      if (rol === 'CLIENTE') {
        await connection.query(
          `INSERT INTO clientes (usuario_id, nombre, telefono, direccion, tipo_cliente)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            usuario.id,
            cliente.nombre || nombre,
            cliente.telefono || null,
            cliente.direccion || null,
            cliente.tipoCliente || 'residencial'
          ]
        );
      }

      await connection.query('COMMIT');
      return usuario;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
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

  if (rol === 'CLIENTE') {
    const nuevoClienteId = Math.max(0, ...store.clientes.map((c) => Number(c.id))) + 1;
    store.clientes.push({
      id: nuevoClienteId,
      usuarioId: nuevo.id,
      nombre: cliente.nombre || nombre,
      telefono: cliente.telefono || null,
      direccion: cliente.direccion || null,
      tipoCliente: cliente.tipoCliente || 'residencial',
      activo: true,
      creadoEn: new Date().toISOString()
    });
  }

  return { ...nuevo };
}

async function actualizar(id, { nombre, email, passwordHash }) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query(
      `UPDATE usuarios
       SET nombre = COALESCE($2, nombre),
           email = COALESCE($3, email),
           password_hash = COALESCE($4, password_hash)
       WHERE id = $1
       RETURNING id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en`,
      [numId, nombre ?? null, email?.trim().toLowerCase() ?? null, passwordHash ?? null]
    );
    return mapearFilaUsuario(rows[0]);
  }

  const store = obtenerMemoryStore();
  const usuario = store.usuarios.find((u) => Number(u.id) === numId);
  if (!usuario) return null;
  if (nombre !== undefined) usuario.nombre = nombre;
  if (email !== undefined) usuario.email = email.trim().toLowerCase();
  if (passwordHash !== undefined) usuario.passwordHash = passwordHash;
  return { ...usuario };
}

async function cambiarRol(id, rol, repartidorCodigo = null) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const connection = await obtenerPool().connect();
    try {
      await connection.query('BEGIN');
      const actual = await connection.query(
        'SELECT id, rol FROM usuarios WHERE id = $1 FOR UPDATE',
        [numId]
      );
      if (!actual.rows[0]) {
        await connection.query('ROLLBACK');
        return null;
      }

      if (actual.rows[0].rol === 'ADMIN' && rol !== 'ADMIN') {
        const admins = await connection.query(
          'SELECT id FROM usuarios WHERE rol = $1 AND activo = TRUE FOR UPDATE',
          ['ADMIN']
        );
        if (admins.rowCount <= 1) {
          throw crearError(409, 'Debe permanecer al menos un usuario ADMIN activo');
        }
      }

      const codigo = rol === 'REPARTIDOR' ? repartidorCodigo : null;
      const { rows } = await connection.query(
        `UPDATE usuarios SET rol = $2, repartidor_codigo = $3
         WHERE id = $1
         RETURNING id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en`,
        [numId, rol, codigo]
      );

      if (rol === 'CLIENTE') {
        await connection.query(
          `INSERT INTO clientes (usuario_id, nombre)
           SELECT id, nombre FROM usuarios WHERE id = $1
           ON CONFLICT (usuario_id) DO NOTHING`,
          [numId]
        );
      }

      await connection.query('COMMIT');
      return mapearFilaUsuario(rows[0]);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  const store = obtenerMemoryStore();
  const usuario = store.usuarios.find((u) => Number(u.id) === numId);
  if (!usuario) return null;
  if (usuario.rol === 'ADMIN' && rol !== 'ADMIN') {
    const admins = store.usuarios.filter((u) => u.rol === 'ADMIN' && u.activo);
    if (admins.length <= 1) {
      throw crearError(409, 'Debe permanecer al menos un usuario ADMIN activo');
    }
  }

  usuario.rol = rol;
  usuario.repartidorCodigo = rol === 'REPARTIDOR' ? repartidorCodigo : null;
  const cliente = store.clientes.find((c) => Number(c.usuarioId) === numId);
  if (rol === 'CLIENTE' && !cliente) {
    const nuevoClienteId = Math.max(0, ...store.clientes.map((c) => Number(c.id))) + 1;
    store.clientes.push({
      id: nuevoClienteId,
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      telefono: null,
      direccion: null,
      tipoCliente: 'residencial',
      activo: true,
      creadoEn: new Date().toISOString()
    });
  }

  return { ...usuario };
}

async function desactivar(id) {
  const numId = Number(id);
  if (esModoPostgres()) {
    const connection = await obtenerPool().connect();
    try {
      await connection.query('BEGIN');
      const actual = await connection.query(
        'SELECT id, rol FROM usuarios WHERE id = $1 FOR UPDATE',
        [numId]
      );
      if (!actual.rows[0]) {
        await connection.query('ROLLBACK');
        return null;
      }

      if (actual.rows[0].rol === 'ADMIN') {
        const admins = await connection.query(
          'SELECT id FROM usuarios WHERE rol = $1 AND activo = TRUE FOR UPDATE',
          ['ADMIN']
        );
        if (admins.rowCount <= 1) {
          throw crearError(409, 'Debe permanecer al menos un usuario ADMIN activo');
        }
      }

      const { rows } = await connection.query(
        `UPDATE usuarios SET activo = FALSE
         WHERE id = $1
         RETURNING id, nombre, email, password_hash, rol, repartidor_codigo, activo, creado_en`,
        [numId]
      );
      await connection.query('COMMIT');
      return mapearFilaUsuario(rows[0]);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  const usuario = obtenerMemoryStore().usuarios.find((u) => Number(u.id) === numId);
  if (!usuario) return null;
  if (usuario.rol === 'ADMIN') {
    const admins = obtenerMemoryStore().usuarios.filter((u) => u.rol === 'ADMIN' && u.activo);
    if (admins.length <= 1) {
      throw crearError(409, 'Debe permanecer al menos un usuario ADMIN activo');
    }
  }
  usuario.activo = false;
  return { ...usuario };
}

async function listarRoles() {
  if (esModoPostgres()) {
    const { rows } = await obtenerPool().query('SELECT nombre FROM roles ORDER BY nombre');
    return rows.map((row) => row.nombre);
  }
  return [...obtenerMemoryStore().roles];
}

async function existeRol(rol) {
  if (esModoPostgres()) {
    const { rowCount } = await obtenerPool().query(
      'SELECT 1 FROM roles WHERE nombre = $1',
      [rol]
    );
    return rowCount > 0;
  }
  return obtenerMemoryStore().roles.includes(rol);
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  listar,
  crear,
  actualizar,
  cambiarRol,
  desactivar,
  listarRoles,
  existeRol,
  existeRepartidor
};
