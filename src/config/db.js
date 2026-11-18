const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const {
  PRODUCTOS_INICIALES,
  REPARTIDORES_INICIALES,
  crearUsuariosIniciales
} = require('./seedData');

let pool = null;
let usarPostgres = false;

// Estado en memoria para entorno de desarrollo/pruebas locales cuando RDS no está definido en .env
const memoryStore = {
  usuarios: [],
  productos: [],
  repartidores: [],
  pedidos: []
};

function reiniciarMemoryStore() {
  memoryStore.usuarios = crearUsuariosIniciales();
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

    // Asegurar que existan las cuentas iniciales por rol con hash BCrypt
    const usuariosSemilla = crearUsuariosIniciales();
    for (const u of usuariosSemilla) {
      await pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, repartidor_codigo, activo)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [u.nombre, u.email, u.passwordHash, u.rol, u.repartidorCodigo, u.activo]
      );
    }

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
