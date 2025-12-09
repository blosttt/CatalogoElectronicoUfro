const bcrypt = require('bcryptjs');  
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            // Validar campos
            if (!username || !password) {
                return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
            }

            // Buscar usuario
            const usuario = await Usuario.findByUsername(username);
            if (!usuario) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Verificar contraseña
            const passwordValida = await bcrypt.compare(password, usuario.password_hash);
            if (!passwordValida) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Generar token
            const token = jwt.sign(
                { 
                    id: usuario.id, 
                    username: usuario.username, 
                    rol: usuario.rol 
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                message: 'Login exitoso',
                token,
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    email: usuario.email,
                    rol: usuario.rol
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    static async loginInvitado(req, res) {
        try {
            // Credenciales fijas para invitado
            const usuario = await Usuario.findByUsername('invitado');
            
            if (!usuario) {
                return res.status(401).json({ error: 'Usuario invitado no configurado' });
            }

            // Generar token para invitado
            const token = jwt.sign(
                { 
                    id: usuario.id, 
                    username: usuario.username, 
                    rol: usuario.rol 
                },
                process.env.JWT_SECRET,
                { expiresIn: '4h' } // Sesión más corta para invitado
            );

            res.json({
                message: 'Login como invitado exitoso',
                token,
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    email: usuario.email,
                    rol: usuario.rol
                }
            });

        } catch (error) {
            console.error('Error en login invitado:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    static async verificarToken(req, res) {
        try {
            const usuario = await Usuario.findById(req.user.id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json({ usuario });
        } catch (error) {
            res.status(500).json({ error: 'Error al verificar token' });
        }
    }
}

module.exports = AuthController;