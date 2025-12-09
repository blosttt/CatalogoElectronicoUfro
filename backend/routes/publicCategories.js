const express = require('express');
const router = express.Router();

// Configuración de la base de datos
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'catalogo_ufro',
    password: process.env.DB_PASSWORD || 'tu_password',
    port: process.env.DB_PORT || 5432,
});

// GET /api/public/categories - Listar categorías (público)
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT * FROM categorias ORDER BY nombre';
        console.log('🔓 Consulta pública categorías');
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en public categories:', error);
        res.status(500).json({ error: 'Error al cargar categorías' });
    }
});

module.exports = router;