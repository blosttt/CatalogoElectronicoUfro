const express = require('express');
const router = express.Router();
const ItemsController = require('../controllers/itemsController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload'); 

// =============================================
// RUTAS DE ITEMS CON CONTROL DE PERMISOS
// =============================================

// 📖 LECTURA - Todos los usuarios autenticados pueden ver
router.get('/', authMiddleware(), ItemsController.getAll);

// 📊 ESTADÍSTICAS - Usar el método correcto que existe
router.get('/stats', authMiddleware(), ItemsController.getStatsPaginated);

router.get('/:id', authMiddleware(), ItemsController.getById);

// ➕ CREAR - Admin y Usuario pueden crear 
router.post('/', 
    authMiddleware(['admin', 'usuario']), 
    upload.array('imagenes', 5), 
    ItemsController.create
);

// ✏️ ACTUALIZAR - Admin y Usuario pueden editar
router.put('/:id', 
    authMiddleware(['admin', 'usuario']), 
    upload.array('imagenes', 5), 
    ItemsController.update
);

// 🗑️ ELIMINAR - Solo Admin puede eliminar 
router.delete('/:id', authMiddleware(['admin']), ItemsController.softDelete);

// 🖼️ ELIMINAR IMAGEN ESPECÍFICA - Solo Admin y Usuario
router.delete('/:id/imagenes/:imageFilename', 
    authMiddleware(['admin', 'usuario']), 
    ItemsController.deleteImage
);

module.exports = router;