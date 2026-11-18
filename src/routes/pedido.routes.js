const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');
const { verificarToken, requerirRoles } = require('../middlewares/auth.middleware');

// Todas las operaciones sobre pedidos requieren autenticación con JWT
router.get('/', verificarToken, pedidoController.listar);
router.get('/:id', verificarToken, pedidoController.obtenerPorId);
router.post('/', verificarToken, requerirRoles('CLIENTE', 'OPERADORA', 'ADMIN'), pedidoController.crear);

// Operadora o Admin asignan repartidor (el pedido pasa a "asignado")
router.patch(
  '/:id/asignar',
  verificarToken,
  requerirRoles('OPERADORA', 'ADMIN'),
  pedidoController.asignarRepartidor
);

// Operadora, Repartidor asignado o Admin actualizan el estado del pedido
router.patch(
  '/:id/estado',
  verificarToken,
  requerirRoles('OPERADORA', 'REPARTIDOR', 'ADMIN'),
  pedidoController.cambiarEstado
);

module.exports = router;
