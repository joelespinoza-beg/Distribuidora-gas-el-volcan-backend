const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');
const { verificarToken, requerirRoles } = require('../middlewares/auth.middleware');

// Rutas públicas: lectura del catálogo y detalle de productos
router.get('/', productoController.listar);
router.get('/:id', productoController.obtenerPorId);

// Rutas protegidas (solo ADMIN): creación, edición y eliminación del catálogo
router.post('/', verificarToken, requerirRoles('ADMIN'), productoController.crear);
router.put('/:id', verificarToken, requerirRoles('ADMIN'), productoController.actualizar);
router.delete('/:id', verificarToken, requerirRoles('ADMIN'), productoController.eliminar);

module.exports = router;
