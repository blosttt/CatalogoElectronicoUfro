const pool = require('../config/database');

class Categoria {
    static async getAll() {
        const result = await pool.query(
            'SELECT * FROM categorias ORDER BY nombre'  
        );
        return result.rows;
    }

    static async getById(id) {
        const result = await pool.query(
            'SELECT * FROM categorias WHERE id = $1',  
            [id]
        );
        return result.rows[0];
    }
}

module.exports = Categoria;