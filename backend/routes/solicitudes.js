const express = require('express');
const router = express.Router();
const SolicitudesController = require('../controllers/solicitudesController');
const authMiddleware = require('../middleware/auth');

// =============================================
// RUTAS DE SOLICITUDES
// =============================================

// 📋 CREAR - Público (invitados pueden crear)
router.post('/', SolicitudesController.create);

// 📖 LISTAR - Solo usuarios logueados (admin y usuario)
router.get('/', authMiddleware(['admin', 'usuario']), SolicitudesController.getAll);

// 📊 ESTADÍSTICAS - Solo usuarios logueados
router.get('/stats', authMiddleware(['admin', 'usuario']), SolicitudesController.getStats);

// 👀 DETALLE - Solo usuarios logueados
router.get('/:id', authMiddleware(['admin', 'usuario']), SolicitudesController.getById);

// ✏️ ACTUALIZAR ESTADO - Solo usuarios logueados
router.put('/:id/estado', authMiddleware(['admin', 'usuario']), SolicitudesController.updateEstado);

// 🗑️ ELIMINAR - Solo admin
router.delete('/:id', authMiddleware(['admin']), SolicitudesController.delete);

module.exports = router;