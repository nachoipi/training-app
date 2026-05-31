import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model.js';
import { createToken } from '../services/auth.service.js';

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
        }
        const user = await UserModel.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Credenciales incorrectas. Verificá tus datos.' });
        }
        const token = createToken(user);
        res.json({
            token,
            user: {
                id:     user.id,
                name:   user.name,
                email:  user.email,
                role:   user.role,
                avatar: user.avatar,
            },
        });
    } catch (err) { next(err); }
};

export const me = async (req, res) => {
    res.json({ user: req.user });
};

export const logout = async (req, res) => {
    res.json({ message: 'Sesión cerrada correctamente.' });
};
