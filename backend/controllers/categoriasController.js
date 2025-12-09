const Categoria = require('../models/Categoria');

class CategoriasController {
    static async getAll(req, res) {
        try {
            const categorias = await Categoria.getAll();
            res.json(categorias);
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const categoria = await Categoria.getById(id);
            
            if (!categoria) {
                return res.status(404).json({ error: 'Categoría no encontrada' });
            }
            
            res.json(categoria);
        } catch (error) {
            console.error('Error al obtener categoría:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

module.exports = CategoriasController;