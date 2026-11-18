const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { verificarLimiteLogin } = require('../middlewares/rateLimit.middleware');

router.post('/register', authController.registrar);
router.post('/login', verificarLimiteLogin, authController.iniciarSesion);
router.get('/me', verificarToken, authController.obtenerPerfil);

module.exports = router;
