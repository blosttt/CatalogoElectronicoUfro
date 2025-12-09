const pool = require('../config/database');

class SolicitudesController {
    
    // 📋 Crear nueva solicitud (pública - para invitados)
    async create(req, res) {
        try {
            const {
                item_id,
                nombre_solicitante,
                email_solicitante,
                telefono_solicitante,
                departamento,
                motivo
            } = req.body;

            // Validaciones básicas
            if (!item_id || !nombre_solicitante || !email_solicitante) {
                return res.status(400).json({
                    success: false,
                    error: 'Item, nombre y email son requeridos'
                });
            }

            // Verificar que el item exista y no esté eliminado
            const itemCheck = await pool.query(
                'SELECT id, nombre FROM items WHERE id = $1 AND estado != $2',
                [item_id, 'eliminado']
            );

            if (itemCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Item no encontrado o no disponible'
                });
            }

            const query = `
                INSERT INTO solicitudes (
                    item_id, nombre_solicitante, email_solicitante, 
                    telefono_solicitante, departamento, motivo
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                item_id,
                nombre_solicitante,
                email_solicitante,
                telefono_solicitante || null,
                departamento || null,
                motivo || null
            ];

            console.log('📋 Creando nueva solicitud:', { item_id, nombre_solicitante });

            const result = await pool.query(query, values);
            const nuevaSolicitud = result.rows[0];

            // Obtener información del item para la respuesta
            const itemInfo = await pool.query(
                'SELECT nombre, codigo_ufro FROM items WHERE id = $1',
                [item_id]
            );

            res.status(201).json({
                success: true,
                message: 'Solicitud creada exitosamente',
                solicitud: nuevaSolicitud,
                item: itemInfo.rows[0]
            });

        } catch (error) {
            console.error('❌ Error en create solicitud:', error);
            res.status(500).json({
                success: false,
                error: 'Error al crear solicitud: ' + error.message
            });
        }
    }

    // 📖 Obtener todas las solicitudes (solo para usuarios logueados)
    async getAll(req, res) {
        try {
            const { estado, page = 1, limit = 20 } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            let baseQuery = `
                SELECT s.*, i.nombre as item_nombre, i.codigo_ufro, i.estado as item_estado
                FROM solicitudes s
                LEFT JOIN items i ON s.item_id = i.id
                WHERE 1=1
            `;

            let countQuery = `
                SELECT COUNT(*) as total
                FROM solicitudes s
                WHERE 1=1
            `;

            const params = [];
            const countParams = [];
            let paramCount = 0;

            if (estado) {
                paramCount++;
                baseQuery += ` AND s.estado = $${paramCount}`;
                countQuery += ` AND s.estado = $${paramCount}`;
                params.push(estado);
                countParams.push(estado);
            }

            baseQuery += ` ORDER BY s.fecha_creacion DESC`;
            
            // Paginación
            paramCount++;
            baseQuery += ` LIMIT $${paramCount}`;
            params.push(limitNum);
            
            paramCount++;
            baseQuery += ` OFFSET $${paramCount}`;
            params.push(offset);

            console.log('📋 Consulta solicitudes:', { page: pageNum, limit: limitNum, estado });

            const [solicitudesResult, countResult] = await Promise.all([
                pool.query(baseQuery, params),
                pool.query(countQuery, countParams)
            ]);

            const totalSolicitudes = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalSolicitudes / limitNum);

            res.json({
                success: true,
                data: solicitudesResult.rows,
                pagination: {
                    currentPage: pageNum,
                    totalPages: totalPages,
                    totalItems: totalSolicitudes,
                    itemsPerPage: limitNum
                }
            });

        } catch (error) {
            console.error('❌ Error en getAll solicitudes:', error);
            res.status(500).json({
                success: false,
                error: 'Error al cargar solicitudes'
            });
        }
    }

    // ✏️ Actualizar estado de solicitud (solo admin/usuario)
    async updateEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado, notas } = req.body;
            const usuarioId = req.user?.id;

            if (!estado) {
                return res.status(400).json({
                    success: false,
                    error: 'Estado es requerido'
                });
            }

            const estadosValidos = ['pendiente', 'en_proceso', 'aprobada', 'rechazada', 'completada'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    error: 'Estado no válido'
                });
            }

            const query = `
                UPDATE solicitudes 
                SET estado = $1, 
                    notas = COALESCE($2, notas),
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const values = [estado, notas || null, id];

            console.log('✏️ Actualizando estado solicitud:', { id, estado, usuarioId });

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Solicitud no encontrada'
                });
            }

            res.json({
                success: true,
                message: `Solicitud ${estado} exitosamente`,
                solicitud: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Error en updateEstado:', error);
            res.status(500).json({
                success: false,
                error: 'Error al actualizar solicitud'
            });
        }
    }

    // 📊 Estadísticas de solicitudes
    async getStats(req, res) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_solicitudes,
                    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
                    COUNT(CASE WHEN estado = 'aprobada' THEN 1 END) as aprobadas,
                    COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
                    COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
                    COUNT(DISTINCT email_solicitante) as solicitantes_unicos
                FROM solicitudes
            `;

            const result = await pool.query(statsQuery);
            res.json({
                success: true,
                stats: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Error en getStats solicitudes:', error);
            res.status(500).json({
                success: false,
                error: 'Error al cargar estadísticas'
            });
        }
    }

    // 👀 Obtener solicitud por ID
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT s.*, 
                       i.nombre as item_nombre, 
                       i.codigo_ufro, 
                       i.descripcion as item_descripcion,
                       i.estado as item_estado,
                       c.nombre as categoria_nombre
                FROM solicitudes s
                LEFT JOIN items i ON s.item_id = i.id
                LEFT JOIN categorias c ON i.categoria_id = c.id
                WHERE s.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Solicitud no encontrada'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Error en getById solicitud:', error);
            res.status(500).json({
                success: false,
                error: 'Error al cargar solicitud'
            });
        }
    }

    // 🗑️ Eliminar solicitud (solo admin)
    async delete(req, res) {
        try {
            const { id } = req.params;

            const query = 'DELETE FROM solicitudes WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Solicitud no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Solicitud eliminada exitosamente',
                solicitud: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Error en delete solicitud:', error);
            res.status(500).json({
                success: false,
                error: 'Error al eliminar solicitud'
            });
        }
    }
}

module.exports = new SolicitudesController();