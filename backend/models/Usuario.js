const pool = require('../config/database');

class Usuario {
    static async findByUsername(username) {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1 AND activo = true',
            [username]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query(
            'SELECT id, username, email, rol FROM usuarios WHERE id = $1 AND activo = true',
            [id]
        );
        return result.rows[0];
    }

    static async crearUsuario(usuarioData) {
        const { username, password_hash, email, rol = 'usuario' } = usuarioData;
        const result = await pool.query(
            'INSERT INTO usuarios (username, password_hash, email, rol) VALUES ($1, $2, $3, $4) RETURNING id, username, email, rol',
            [username, password_hash, email, rol]
        );
        return result.rows[0];
    }
}

module.exports = Usuario;