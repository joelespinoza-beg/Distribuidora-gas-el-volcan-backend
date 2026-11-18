const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verificarToken, requerirRoles } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.get('/roles', requerirRoles('ADMIN'), usuarioController.listarRoles);
router.get('/', requerirRoles('ADMIN'), usuarioController.listar);
router.post('/', requerirRoles('ADMIN'), usuarioController.crear);
router.get('/:id', usuarioController.obtenerPorId);
router.patch('/:id', usuarioController.actualizar);
router.patch('/:id/rol', requerirRoles('ADMIN'), usuarioController.cambiarRol);
router.delete('/:id', requerirRoles('ADMIN'), usuarioController.eliminar);

module.exports = router;
