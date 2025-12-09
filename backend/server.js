const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const categoriasRoutes = require('./routes/categorias');

// Importar NUEVAS rutas públicas
const publicItemsRoutes = require('./routes/publicItems');
const publicCategoriesRoutes = require('./routes/publicCategories');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// SERVIR ARCHIVOS ESTÁTICOS CORRECTAMENTE
// Ruta absoluta al frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log('📁 Ruta del frontend:', frontendPath);

// Servir archivos estáticos del frontend
app.use(express.static(frontendPath));

// RUTAS PÚBLICAS (sin autenticación)
app.use('/api/public/items', publicItemsRoutes);
app.use('/api/public/categories', publicCategoriesRoutes);

// Agregar esta línea donde configuras las rutas
app.use('/api/solicitudes', require('./routes/solicitudes'));

// Rutas API (protegidas)
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para servir el frontend 
app.get('/', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    console.log('📄 Intentando servir:', indexPath);
    
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('❌ Error sirviendo index.html:', err.message);
            res.status(404).json({ 
                error: 'Archivo no encontrado',
                message: 'El frontend no está disponible en la ruta esperada',
                expectedPath: indexPath
            });
        }
    });
});

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({ 
        message: '🚀 Servidor Catálogo UFRO funcionando',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        frontendPath: frontendPath,
        features: {
            publicRoutes: true,
            auth: true,
            items: true,
            categories: true
        }
    });
});

// Ruta para verificar rutas públicas
app.get('/api/public/health', (req, res) => {
    res.json({ 
        message: '🔓 Rutas públicas funcionando',
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET /api/public/items',
            'GET /api/public/items/:id',
            'GET /api/public/items/stats/estadisticas',
            'GET /api/public/categories'
        ]
    });
});




// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error del servidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor Catálogo UFRO ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`🔓 API Pública: http://localhost:${PORT}/api/public`);
    console.log(`❤️  Salud: http://localhost:${PORT}/api/health`);
    console.log(`📊 Salud Pública: http://localhost:${PORT}/api/public/health`);
    console.log(`📁 Ruta frontend: ${frontendPath}`);
});