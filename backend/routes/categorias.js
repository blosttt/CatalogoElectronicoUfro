const express = require('express');
const router = express.Router();
const CategoriasController = require('../controllers/categoriasController');
const authMiddleware = require('../middleware/auth');

// Rutas públicas (no requieren autenticación)
router.get('/', CategoriasController.getAll);
router.get('/:id', CategoriasController.getById);

module.exports = router;