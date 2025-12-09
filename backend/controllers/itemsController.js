const pool = require('../config/database');

class ItemsController {
    
    // 📖 Obtener todos los items 
    async getAll(req, res) {
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

            console.log('🔍 Consulta items paginada:', { 
                query: baseQuery, 
                params,
                page: pageNum,
                limit: limitNum,
                offset
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
            console.error('❌ Error en getAll:', error);
            res.status(500).json({ 
                success: false,
                error: 'Error al cargar items' 
            });
        }
    }

    // 📊 Obtener estadísticas - AGREGAR ESTE MÉTODO
    async getStats(req, res) {
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
            
            console.log('📊 Consulta estadísticas (excluyendo eliminados)');
            const result = await pool.query(statsQuery);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Error en getStats:', error);
            res.status(500).json({ error: 'Error al cargar estadísticas' });
        }
    }



    // 📊 Obtener estadísticas 
    async getStatsPaginated(req, res) {
        try {
            const { page = 1, limit = 12 } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            // Consulta para items paginados
            const itemsQuery = `
                SELECT i.*, c.nombre as categoria_nombre 
                FROM items i 
                LEFT JOIN categorias c ON i.categoria_id = c.id 
                WHERE i.estado != 'eliminado'
                ORDER BY i.fecha_creacion DESC
                LIMIT $1 OFFSET $2
            `;

            // Consulta para estadísticas generales
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

            const [itemsResult, statsResult] = await Promise.all([
                pool.query(itemsQuery, [limitNum, offset]),
                pool.query(statsQuery)
            ]);

            // Procesar imágenes
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
                items: itemsConImagenes,
                stats: statsResult.rows[0],
                pagination: {
                    currentPage: pageNum,
                    itemsPerPage: limitNum,
                    offset: offset
                }
            });
        } catch (error) {
            console.error('❌ Error en getStatsPaginated:', error);
            res.status(500).json({ 
                success: false,
                error: 'Error al cargar estadísticas paginadas' 
            });
        }
    }

    // 👀 Obtener item por ID 
    async getById(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT i.*, c.nombre as categoria_nombre 
                FROM items i 
                LEFT JOIN categorias c ON i.categoria_id = c.id 
                WHERE i.id = $1 AND i.estado != 'eliminado'  -- EXCLUIR ITEMS ELIMINADOS
            `;
            
            console.log('👀 Consulta item por ID:', id);
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

            // Asegurar que la fecha venga en formato correcto
            if (item.fecha_adquisicion) {
                // Convertir a formato ISO para consistencia
                item.fecha_adquisicion = new Date(item.fecha_adquisicion).toISOString();
            }

            res.json(item);
        } catch (error) {
            console.error('❌ Error en getById:', error);
            res.status(500).json({ error: 'Error al cargar el item' });
        }
    }

    // ➕ Crear nuevo item CON IMÁGENES
    async create(req, res) {
        try {
            const {
                codigo_ufro, nombre, descripcion, categoria_id,
                ubicacion_bodega, cantidad, estado, fecha_adquisicion,
                valor_aproximado, marca, modelo, especificaciones
            } = req.body;

            // Validaciones básicas
            if (!codigo_ufro || !nombre) {
                return res.status(400).json({ error: 'Código UFRO y Nombre son requeridos' });
            }

            // Procesar imágenes si existen
            let imagenesData = [];
            if (req.files && req.files.length > 0) {
                imagenesData = req.files.map(file => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype,
                    uploadedAt: new Date().toISOString()
                }));
            }

            // Convertir a JSON string - manejar array vacío correctamente
            const imagenesJson = imagenesData.length > 0 ? JSON.stringify(imagenesData) : '[]';

            // Manejar fecha correctamente (puede venir como string vacío)
            const fechaAdq = fecha_adquisicion && fecha_adquisicion !== '' ? 
                new Date(fecha_adquisicion).toISOString() : null;

            const query = `
                INSERT INTO items (
                    codigo_ufro, nombre, descripcion, categoria_id,
                    ubicacion_bodega, cantidad, estado, fecha_adquisicion,
                    valor_aproximado, marca, modelo, especificaciones, imagenes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const values = [
                codigo_ufro, nombre, descripcion, categoria_id,
                ubicacion_bodega, cantidad || 1, estado || 'bueno', fechaAdq,
                valor_aproximado, marca, modelo, especificaciones,
                imagenesJson
            ];

            console.log('➕ Creando nuevo item:', { 
                valores: values.slice(0, -1), 
                totalImagenes: imagenesData.length,
                fechaAdquisicion: fechaAdq
            });
            
            const result = await pool.query(query, values);
            
            // Parsear imágenes en la respuesta
            const itemCreado = result.rows[0];
            if (itemCreado.imagenes && typeof itemCreado.imagenes === 'string') {
                try {
                    itemCreado.imagenes = JSON.parse(itemCreado.imagenes);
                } catch (error) {
                    console.warn('❌ Error parseando imágenes en respuesta:', error);
                    itemCreado.imagenes = [];
                }
            } else if (!itemCreado.imagenes) {
                itemCreado.imagenes = [];
            }
            
            res.status(201).json(itemCreado);
        } catch (error) {
            console.error('❌ Error en create:', error);
            
            // Manejar error de código único duplicado
            if (error.code === '23505') {
                return res.status(400).json({ error: 'El código UFRO ya existe' });
            }
            
            res.status(500).json({ error: 'Error al crear item: ' + error.message });
        }
    }

    // ✏️ Actualizar item CON IMÁGENES - CORREGIDO
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                codigo_ufro, nombre, descripcion, categoria_id,
                ubicacion_bodega, cantidad, estado, fecha_adquisicion,
                valor_aproximado, marca, modelo, especificaciones,
                imagenes_existentes // Array de imágenes que se mantienen
            } = req.body;

            // Validaciones básicas
            if (!codigo_ufro || !nombre) {
                return res.status(400).json({ error: 'Código UFRO y Nombre son requeridos' });
            }

            // Procesar nuevas imágenes
            let nuevasImagenes = [];
            if (req.files && req.files.length > 0) {
                nuevasImagenes = req.files.map(file => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype,
                    uploadedAt: new Date().toISOString()
                }));
            }

            // Combinar imágenes existentes con nuevas
            let imagenesCombinadas = [];
            try {
                // Si hay imágenes existentes, parsearlas
                if (imagenes_existentes) {
                    const imagenesExistentesParsed = typeof imagenes_existentes === 'string' 
                        ? JSON.parse(imagenes_existentes) 
                        : imagenes_existentes;
                    imagenesCombinadas = [...imagenesExistentesParsed, ...nuevasImagenes];
                } else {
                    // Si no hay imágenes existentes, usar solo las nuevas
                    imagenesCombinadas = nuevasImagenes;
                }
            } catch (error) {
                console.warn('❌ Error parseando imágenes existentes, usando solo nuevas');
                imagenesCombinadas = nuevasImagenes;
            }

            // Convertir a JSON string - asegurar que siempre sea un array válido
            const imagenesJson = imagenesCombinadas.length > 0 ? JSON.stringify(imagenesCombinadas) : '[]';

            // Manejar fecha correctamente (puede venir como string vacío)
            const fechaAdq = fecha_adquisicion && fecha_adquisicion !== '' ? 
                new Date(fecha_adquisicion).toISOString() : null;

            const query = `
                UPDATE items SET
                    codigo_ufro = $1, nombre = $2, descripcion = $3, categoria_id = $4,
                    ubicacion_bodega = $5, cantidad = $6, estado = $7, fecha_adquisicion = $8,
                    valor_aproximado = $9, marca = $10, modelo = $11, especificaciones = $12,
                    imagenes = $13, fecha_actualizacion = NOW()
                WHERE id = $14 AND estado != 'eliminado'  -- NO actualizar items eliminados
                RETURNING *
            `;

            const values = [
                codigo_ufro, nombre, descripcion, categoria_id,
                ubicacion_bodega, cantidad, estado, fechaAdq,
                valor_aproximado, marca, modelo, especificaciones,
                imagenesJson,
                id
            ];

            console.log('✏️ Actualizando item ID:', id, { 
                valores: values.slice(0, -2), 
                totalImagenes: imagenesCombinadas.length,
                fechaAdquisicion: fechaAdq
            });
            
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Item no encontrado o está eliminado' });
            }

            // Parsear imágenes en la respuesta
            const itemActualizado = result.rows[0];
            if (itemActualizado.imagenes && typeof itemActualizado.imagenes === 'string') {
                try {
                    itemActualizado.imagenes = JSON.parse(itemActualizado.imagenes);
                } catch (error) {
                    console.warn('❌ Error parseando imágenes en respuesta:', error);
                    itemActualizado.imagenes = [];
                }
            } else if (!itemActualizado.imagenes) {
                itemActualizado.imagenes = [];
            }

            res.json(itemActualizado);
        } catch (error) {
            console.error('❌ Error en update:', error);
            
            // Manejar error de código único duplicado
            if (error.code === '23505') {
                return res.status(400).json({ error: 'El código UFRO ya existe' });
            }
            
            res.status(500).json({ error: 'Error al actualizar item: ' + error.message });
        }
    }

    // 🗑️ SOFT DELETE - Marcar como eliminado en lugar de borrar
    async softDelete(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                UPDATE items 
                SET estado = 'eliminado', 
                    fecha_actualizacion = NOW() 
                WHERE id = $1 
                RETURNING *
            `;
            
            console.log('🗑️ Soft delete del item ID:', id);
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Item no encontrado' });
            }

            res.json({ 
                message: 'Item marcado como eliminado correctamente', 
                item: result.rows[0] 
            });
            
        } catch (error) {
            console.error('❌ Error en softDelete:', error);
            res.status(500).json({ error: 'Error al eliminar item' });
        }
    }

    // 💀 ELIMINACIÓN FÍSICA
    async hardDelete(req, res) {
        try {
            const { id } = req.params;
            
            const query = 'DELETE FROM items WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Item no encontrado' });
            }

            res.json({ 
                message: 'Item eliminado físicamente', 
                item: result.rows[0] 
            });
            
        } catch (error) {
            console.error('❌ Error en hardDelete:', error);
            res.status(500).json({ error: 'Error al eliminar item físicamente' });
        }
    }

    // 🖼️ ELIMINAR IMAGEN ESPECÍFICA de un item
    async deleteImage(req, res) {
        try {
            const { id, imageFilename } = req.params;
            
            // Obtener el item actual
            const itemQuery = 'SELECT imagenes FROM items WHERE id = $1';
            const itemResult = await pool.query(itemQuery, [id]);
            
            if (itemResult.rows.length === 0) {
                return res.status(404).json({ error: 'Item no encontrado' });
            }

            let imagenes = itemResult.rows[0].imagenes;
            
            // Parsear las imágenes si es un string
            if (typeof imagenes === 'string') {
                try {
                    imagenes = JSON.parse(imagenes);
                } catch (error) {
                    console.error('❌ Error parseando imágenes para eliminar:', error);
                    return res.status(500).json({ error: 'Error al procesar imágenes del item' });
                }
            }

            // Si no hay imágenes o no es un array, inicializar como array vacío
            if (!Array.isArray(imagenes)) {
                imagenes = [];
            }

            // Filtrar la imagen a eliminar
            const imagenesActualizadas = imagenes.filter(img => img.filename !== imageFilename);
            
            if (imagenes.length === imagenesActualizadas.length) {
                return res.status(404).json({ error: 'Imagen no encontrada' });
            }

            // Convertir a JSON string para guardar
            const imagenesJson = JSON.stringify(imagenesActualizadas);

            // Actualizar el item
            const updateQuery = `
                UPDATE items 
                SET imagenes = $1, fecha_actualizacion = NOW() 
                WHERE id = $2 
                RETURNING *
            `;

            const updateResult = await pool.query(updateQuery, [
                imagenesJson, 
                id
            ]);

            // Parsear imágenes en la respuesta
            const itemActualizado = updateResult.rows[0];
            if (itemActualizado.imagenes && typeof itemActualizado.imagenes === 'string') {
                try {
                    itemActualizado.imagenes = JSON.parse(itemActualizado.imagenes);
                } catch (error) {
                    console.warn('❌ Error parseando imágenes en respuesta:', error);
                    itemActualizado.imagenes = [];
                }
            } else if (!itemActualizado.imagenes) {
                itemActualizado.imagenes = [];
            }

            res.json({
                message: 'Imagen eliminada correctamente',
                item: itemActualizado
            });

        } catch (error) {
            console.error('❌ Error en deleteImage:', error);
            res.status(500).json({ error: 'Error al eliminar imagen: ' + error.message });
        }
    }
}

module.exports = new ItemsController();