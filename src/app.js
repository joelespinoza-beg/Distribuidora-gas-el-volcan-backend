require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { esModoPostgres } = require('./config/db');

const saludoRoutes = require('./routes/saludo.routes');
const authRoutes = require('./routes/auth.routes');
const productoRoutes = require('./routes/producto.routes');
const pedidoRoutes = require('./routes/pedido.routes');
const repartidorRoutes = require('./routes/repartidor.routes');

const app = express();

// Configuración de CORS (orígenes permitidos del frontend React)
const origenesConfigurados = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenesConfigurados.length > 0 ? origenesConfigurados : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());

// Documentación interactiva Swagger UI y especificación OpenAPI en JSON
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.status(200).json(swaggerSpec);
});

// Endpoint de salud e información general
app.get('/api/health', (req, res) => {
  res.status(200).json({
    estado: 'OK',
    proyecto: 'Distribuidora de Gas El Volcán - Backend API',
    motorPersistencia: esModoPostgres() ? 'PostgreSQL (Amazon RDS)' : 'Memoria local con datos semilla',
    documentacion: '/api-docs'
  });
});

// Montaje de rutas de la API
app.use('/api', saludoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/repartidores', repartidorRoutes);

// Manejador 404 para rutas no existentes (compatible con Guía 18)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador centralizado de errores (sin filtrar contraseñas, tokens ni trazas internas)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const respuesta = {
    error: err.message || 'Error interno del servidor'
  };
  if (err.detalles) {
    respuesta.detalles = err.detalles;
  }
  res.status(status).json(respuesta);
});

module.exports = app;
