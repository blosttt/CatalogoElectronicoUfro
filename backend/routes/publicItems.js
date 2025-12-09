const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/public/items - Listar items (público) CON PAGINACIÓN
router.get('/', async (req, res) => {
    try {
        const { 
            busqueda, 
            categoria_id, 
            estado, 
            page = 1, 
            limit = 12,
            sortBy = 'fecha_creacion',
            sortOrder = 'DESC'
        } = req.query;
        
        // Validar parámetros de paginación
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        
        if (pageNum < 1 || limitNum < 1) {
            return res.status(400).json({ error: 'Parámetros de paginación inválidos' });
        }

        // Consulta principal con filtros
        let baseQuery = `
            SELECT i.*, c.nombre as categoria_nombre 
            FROM items i 
            LEFT JOIN categorias c ON i.categoria_id = c.id 
            WHERE i.estado != 'eliminado'
        `;
        
        // Consulta para contar total (sin paginación)
        let countQuery = `
            SELECT COUNT(*) as total
            FROM items i 
            LEFT JOIN categorias c ON i.categoria_id = c.id 
            WHERE i.estado != 'eliminado'
        `;
        
        const params = [];
        const countParams = [];
        let paramCount = 0;

        // Aplicar filtros
        if (busqueda) {
            paramCount++;
            const searchCondition = ` AND (i.nombre ILIKE $${paramCount} OR i.codigo_ufro ILIKE $${paramCount} OR i.descripcion ILIKE $${paramCount})`;
            baseQuery += searchCondition;
            countQuery += searchCondition;
            params.push(`%${busqueda}%`);
            countParams.push(`%${busqueda}%`);
        }

        if (categoria_id) {
            paramCount++;
            baseQuery += ` AND i.categoria_id = $${paramCount}`;
            countQuery += ` AND i.categoria_id = $${paramCount}`;
            params.push(categoria_id);
            countParams.push(categoria_id);
        }

        if (estado) {
            paramCount++;
            baseQuery += ` AND i.estado = $${paramCount}`;
            countQuery += ` AND i.estado = $${paramCount}`;
            params.push(estado);
            countParams.push(estado);
        }

        // Validar y aplicar ordenamiento
        const validSortColumns = ['nombre', 'codigo_ufro', 'estado', 'fecha_creacion', 'fecha_adquisicion', 'valor_aproximado'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'fecha_creacion';
        const validSortOrders = ['ASC', 'DESC'];
        const orderDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        baseQuery += ` ORDER BY i.${sortColumn} ${orderDirection}`;
        
        // Aplicar paginación
        paramCount++;
        baseQuery += ` LIMIT $${paramCount}`;
        params.push(limitNum);
        
        paramCount++;
        baseQuery += ` OFFSET $${paramCount}`;
        params.push(offset);

        console.log('🔓 Consulta pública items paginada:', { 
            page: pageNum,
            limit: limitNum,
            offset,
            filtros: { busqueda, categoria_id, estado }
        });

        // Ejecutar ambas consultas en paralelo
        const [itemsResult, countResult] = await Promise.all([
            pool.query(baseQuery, params),
            pool.query(countQuery, countParams)
        ]);
        
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Procesar imágenes para convertir de JSON string a objeto
        const itemsConImagenes = itemsResult.rows.map(item => {
            if (item.imagenes && typeof item.imagenes === 'string') {
                try {
                    item.imagenes = JSON.parse(item.imagenes);
                } catch (error) {
                    console.warn('❌ Error parseando imágenes para item', item.id, error);
                    item.imagenes = [];
                }
            } else if (!item.imagenes) {
                item.imagenes = [];
            }
            return item;
        });
        
        res.json({
            success: true,
            data: itemsConImagenes,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: totalItems,
                itemsPerPage: limitNum,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
    } catch (error) {
        console.error('❌ Error en public items:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al cargar items' 
        });
    }
});

// GET /api/public/items/:id - Detalles de item (público) 
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT i.*, c.nombre as categoria_nombre 
            FROM items i 
            LEFT JOIN categorias c ON i.categoria_id = c.id 
            WHERE i.id = $1 AND i.estado != 'eliminado'
        `;
        
        console.log('🔓 Consulta pública item ID:', id);
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        // Procesar imágenes
        let item = result.rows[0];
        if (item.imagenes && typeof item.imagenes === 'string') {
            try {
                item.imagenes = JSON.parse(item.imagenes);
            } catch (error) {
                console.warn('❌ Error parseando imágenes para item', item.id, error);
                item.imagenes = [];
            }
        } else if (!item.imagenes) {
            item.imagenes = [];
        }

        res.json(item);
    } catch (error) {
        console.error('❌ Error en public item details:', error);
        res.status(500).json({ error: 'Error al cargar detalles del item' });
    }
});

// GET /api/public/items/stats/estadisticas - Estadísticas (público)
router.get('/stats/estadisticas', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_items,
                COUNT(CASE WHEN estado = 'bueno' THEN 1 END) as total_buenos,
                COUNT(CASE WHEN estado = 'regular' THEN 1 END) as total_regulares,
                COUNT(CASE WHEN estado = 'malo' THEN 1 END) as total_malos,
                COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as total_inactivos,
                COALESCE(SUM(valor_aproximado), 0) as valor_total
            FROM items 
            WHERE estado != 'eliminado'
        `;
        
        console.log('🔓 Consulta pública estadísticas');
        const result = await pool.query(statsQuery);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error en public stats:', error);
        res.status(500).json({ error: 'Error al cargar estadísticas' });
    }
});

module.exports = router;