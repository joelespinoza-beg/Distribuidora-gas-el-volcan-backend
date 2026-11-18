const express = require('express');
const router = express.Router();
const repartidorController = require('../controllers/repartidor.controller');
const { verificarToken, requerirRoles } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, requerirRoles('OPERADORA', 'REPARTIDOR', 'ADMIN'), repartidorController.listar);

module.exports = router;
