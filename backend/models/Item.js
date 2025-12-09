const pool = require('../config/database');

class Item {
    static async getAll(filtros = {}) {
        let query = `
            SELECT i.*, c.nombre as categoria_nombre 
            FROM items i 
            LEFT JOIN categorias c ON i.categoria_id = c.id 
            WHERE i.activo = true
        `;
        const valores = [];
        let contador = 1;

        if (filtros.categoria_id) {
            query += ` AND i.categoria_id = $${contador}`;
            valores.push(filtros.categoria_id);
            contador++;
        }

        if (filtros.estado) {
            query += ` AND i.estado = $${contador}`;
            valores.push(filtros.estado);
            contador++;
        }

        if (filtros.busqueda) {
            query += ` AND (
                i.nombre ILIKE $${contador} OR 
                i.descripcion ILIKE $${contador} OR 
                i.codigo_ufro ILIKE $${contador}
            )`;
            valores.push(`%${filtros.busqueda}%`);
            contador++;
        }

        query += ' ORDER BY i.fecha_creacion DESC';

        const result = await pool.query(query, valores);
        return result.rows;
    }

    static async getById(id) {
        const result = await pool.query(
            `SELECT i.*, c.nombre as categoria_nombre 
             FROM items i 
             LEFT JOIN categorias c ON i.categoria_id = c.id 
             WHERE i.id = $1 AND i.activo = true`,
            [id]
        );
        return result.rows[0];
    }

    static async create(itemData) {
        const {
            codigo_ufro, nombre, descripcion, categoria_id,
            ubicacion_bodega, cantidad, estado, fecha_adquisicion,
            valor_aproximado, marca, modelo, especificaciones,
            usuario_creacion
        } = itemData;

        const result = await pool.query(
            `INSERT INTO items (
                codigo_ufro, nombre, descripcion, categoria_id,
                ubicacion_bodega, cantidad, estado, fecha_adquisicion,
                valor_aproximado, marca, modelo, especificaciones, usuario_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                codigo_ufro, nombre, descripcion, categoria_id,
                ubicacion_bodega, cantidad, estado, fecha_adquisicion,
                valor_aproximado, marca, modelo, especificaciones,
                usuario_creacion
            ]
        );
        return result.rows[0];
    }

    static async update(id, itemData) {
        const campos = [];
        const valores = [];
        let contador = 1;

        Object.keys(itemData).forEach(key => {
            if (itemData[key] !== undefined) {
                campos.push(`${key} = $${contador}`);
                valores.push(itemData[key]);
                contador++;
            }
        });

        if (campos.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        valores.push(id);
        const query = `UPDATE items SET ${campos.join(', ')} WHERE id = $${contador} RETURNING *`;
        
        const result = await pool.query(query, valores);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query(
            'UPDATE items SET activo = false WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0];
    }

    static async getStats() {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_items,
                COUNT(*) FILTER (WHERE estado = 'bueno') as total_buenos,
                COUNT(*) FILTER (WHERE estado = 'regular') as total_regulares,
                COUNT(*) FILTER (WHERE estado = 'malo') as total_malos,
                COUNT(*) FILTER (WHERE estado = 'inactivo') as total_inactivos,
                COALESCE(SUM(valor_aproximado * cantidad), 0) as valor_total
            FROM items 
            WHERE activo = true
        `);
        return result.rows[0];
    }
}

module.exports = Item;