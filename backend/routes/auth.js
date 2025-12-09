const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Rutas de autenticación
router.post('/login', AuthController.login);
router.post('/login/invitado', AuthController.loginInvitado);
router.get('/verificar', authMiddleware(), AuthController.verificarToken);

module.exports = router;