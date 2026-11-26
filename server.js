const app = require('./src/app');
const { inicializarBaseDeDatos } = require('./src/config/db');
const { obtenerConfiguracionJwt } = require('./src/middlewares/auth.middleware');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`)
  .trim()
  .replace(/\/+$/, '');

async function iniciarServidor() {
  obtenerConfiguracionJwt();
  const estadoDb = await inicializarBaseDeDatos();
  app.listen(PORT, HOST, () => {
    console.log(`API Express lista en puerto ${PORT} (modo DB: ${estadoDb.modo})`);
    console.log(`Documentación Swagger UI disponible en ${PUBLIC_BASE_URL}/api-docs`);
  });
}

iniciarServidor();
