const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');
const { verificarToken, requerirRoles } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.get('/', requerirRoles('ADMIN'), clienteController.listar);
router.post('/', requerirRoles('ADMIN'), clienteController.crear);
router.get('/me', clienteController.obtenerMio);
router.patch('/me', clienteController.actualizarMio);
router.get('/:id', clienteController.obtenerPorId);
router.patch('/:id', clienteController.actualizar);
router.delete('/:id', requerirRoles('ADMIN'), clienteController.eliminar);

module.exports = router;
