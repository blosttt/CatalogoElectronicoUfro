const jwt = require('jsonwebtoken');

const authMiddleware = (rolesPermitidos = []) => {
    return (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            
            // Verificar roles si se especifican
            if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(decoded.rol)) {
                return res.status(403).json({ error: 'Acceso denegado. Permisos insuficientes.' });
            }
            
            next();
        } catch (error) {
            res.status(401).json({ error: 'Token inválido.' });
        }
    };
};

module.exports = authMiddleware;