const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'catalogo_ufro_new',
    password: process.env.DB_PASSWORD || 'tu_password',
    port: process.env.DB_PORT || 5432,
});

// Verificar conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conexión a PostgreSQL establecida');
        release();
    }
});

module.exports = pool;