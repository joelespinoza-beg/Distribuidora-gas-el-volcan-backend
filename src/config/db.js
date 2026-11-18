const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const {
  PRODUCTOS_INICIALES,
  REPARTIDORES_INICIALES,
  crearUsuariosIniciales,
  SALT_ROUNDS
} = require('./seedData');

let pool = null;
let usarPostgres = false;

// Estado en memoria para entorno de desarrollo/pruebas locales cuando RDS no está definido en .env
const memoryStore = {
  usuarios: [],
  roles: ['ADMIN', 'CLIENTE', 'OPERADORA', 'REPARTIDOR'],
  clientes: [],
  productos: [],
  repartidores: [],
  pedidos: []
};

function reiniciarMemoryStore() {
  memoryStore.usuarios = crearUsuariosIniciales();
  memoryStore.clientes = memoryStore.usuarios
    .filter((usuario) => usuario.rol === 'CLIENTE')
    .map((usuario, index) => ({
      id: index + 1,
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      telefono: null,
      direccion: null,
      tipoCliente: 'residencial',
      activo: true,
      creadoEn: new Date().toISOString()
    }));
  memoryStore.productos = PRODUCTOS_INICIALES.map((p) => ({ ...p }));
  memoryStore.repartidores = REPARTIDORES_INICIALES.map((r) => ({ ...r }));
  memoryStore.pedidos = [];
}

reiniciarMemoryStore();

function configurarPoolPostgres() {
  const modo = (process.env.DB_MODE || 'auto').toLowerCase();
  const host = (process.env.DB_HOST || '').trim();

  if (modo === 'memory' || (modo === 'auto' && !host)) {
    usarPostgres = false;
    return null;
  }

  const sslHabilitado = String(process.env.DB_SSL || 'true').toLowerCase() !== 'false';

  pool = new Pool({
    host: host || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'elvolcan_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: sslHabilitado ? { rejectUnauthorized: false } : false
  });

  usarPostgres = true;
  return pool;
}

configurarPoolPostgres();

async function inicializarBaseDeDatos() {
  if (!usarPostgres || !pool) {
    return { modo: 'memory', conectado: true };
  }

  try {
    const schemaPath = path.join(__dirname, '../../sql/schema_and_seed.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);

    const emailAdministrador = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const claveAdministrador = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';

    if (emailAdministrador || claveAdministrador) {
      if (!emailAdministrador ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAdministrador) ||
          !claveAdministrador ||
          claveAdministrador.length < 12) {
        throw new Error(
          'Configura BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (mínimo 12 caracteres) para crear el administrador inicial.'
        );
      }

      const passwordHash = await bcrypt.hash(claveAdministrador, SALT_ROUNDS);
      const resultado = await pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
         VALUES ('Administrador inicial', $1, $2, 'ADMIN', TRUE)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [emailAdministrador, passwordHash]
      );

      if (resultado.rowCount === 0) {
        const existente = await pool.query(
          'SELECT rol FROM usuarios WHERE LOWER(email) = $1 LIMIT 1',
          [emailAdministrador]
        );
        if (existente.rows[0]?.rol !== 'ADMIN') {
          throw new Error('BOOTSTRAP_ADMIN_EMAIL ya está asociado a una cuenta que no es ADMIN.');
        }
      }
    }

    await pool.query(
      `INSERT INTO clientes (usuario_id, nombre)
       SELECT id, nombre FROM usuarios
       WHERE rol = 'CLIENTE'
       ON CONFLICT (usuario_id) DO NOTHING`
    );

    return {
      modo: 'postgres',
      conectado: true,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME || 'elvolcan_db'
    };
  } catch (error) {
    if ((process.env.DB_MODE || 'auto').toLowerCase() === 'postgres') {
      throw error;
    }
    console.warn('[DB] No fue posible conectar a PostgreSQL RDS; activando modo memoria local:', error.message);
    usarPostgres = false;
    return { modo: 'memory-fallback', conectado: true, detalle: error.message };
  }
}

function esModoPostgres() {
  return usarPostgres && pool !== null;
}

function obtenerPool() {
  return pool;
}

function obtenerMemoryStore() {
  return memoryStore;
}

module.exports = {
  inicializarBaseDeDatos,
  esModoPostgres,
  obtenerPool,
  obtenerMemoryStore,
  reiniciarMemoryStore
};
