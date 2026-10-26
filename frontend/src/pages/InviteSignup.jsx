// Public signup page opened from a trainer's invitation link (/invite/:token).
// Validates the token, shows who invited the athlete, and creates the athlete's
// own profile already linked to that trainer. Reuses the Login page styles.
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getInvite, registerAthlete } from '../services/authService.js';
import '../styles/login.css';

export default function InviteSignup() {
    const { token } = useParams();
    const navigate = useNavigate();

    // 'loading' | 'ready' | 'invalid'
    const [status, setStatus] = useState('loading');
    const [invite, setInvite] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getInvite(token)
            .then((inv) => {
                setInvite(inv);
                setName(inv.name || '');
                setEmail(inv.email || '');
                setStatus('ready');
            })
            .catch(() => setStatus('invalid'));
    }, [token]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!name.trim()) return setError('Ingresá tu nombre.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Ingresá un email válido.');
        if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
        setLoading(true);
        try {
            await registerAthlete({ token, name: name.trim(), email: email.trim(), password });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'No pudimos crear tu cuenta.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="layout">
                <div className="panel-left">
                    <div className="hero-content">
                        <div className="brand-tag"><div className="brand-dot"/><span>Athlete Portal</span></div>
                        <h1 className="hero-title">Fit<em>Core</em><br/>Pro</h1>
                        <p className="hero-sub">
                            Seguí tus rutinas, registrá cada sesión y visualizá tu progreso en tiempo real.
                        </p>
                    </div>
                </div>

                <div className="panel-right">
                    {status === 'loading' && <p className="hero-sub">Verificando invitación…</p>}

                    {status === 'invalid' && (
                        <>
                            <div className="login-header fade-in">
                                <span className="login-label">Invitación</span>
                                <h2 className="login-title">Link<br/><span className="muted">inválido</span></h2>
                            </div>
                            <div className="error-msg">
                                <span>La invitación no es válida o ya venció. Pedile a tu entrenador que te envíe una nueva.</span>
                            </div>
                            <Link to="/login" className="forgot-link">Ya tengo cuenta · Iniciar sesión</Link>
                        </>
                    )}

                    {status === 'ready' && (
                        <>
                            <div className="login-header fade-in">
                                <span className="login-label">Invitación de {invite.trainerName}</span>
                                <h2 className="login-title">Creá tu<br/><span className="muted">perfil</span></h2>
                            </div>

                            {error && <div className="error-msg"><span>{error}</span></div>}

                            <form onSubmit={handleSubmit} noValidate>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="name">Nombre</label>
                                    <div className="input-wrapper">
                                        <input className="form-input" id="name" autoComplete="name"
                                            style={{ paddingLeft: 14 }}
                                            value={name} onChange={e => { setName(e.target.value); setError(''); }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="email">Email</label>
                                    <div className="input-wrapper">
                                        <input className="form-input" id="email" type="email" autoComplete="email"
                                            style={{ paddingLeft: 14 }}
                                            readOnly={!!invite.email}
                                            value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="password">Contraseña (mín. 8 caracteres)</label>
                                    <div className="input-wrapper">
                                        <input className="form-input" id="password" autoComplete="new-password"
                                            style={{ paddingLeft: 14 }}
                                            type={showPass ? 'text' : 'password'}
                                            value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
                                        <button type="button" className="toggle-pass" aria-label="Mostrar contraseña"
                                            onClick={() => setShowPass(s => !s)}>{showPass ? '🙈' : '👁'}</button>
                                    </div>
                                </div>
                                <button type="submit" className="btn-login" disabled={loading}>
                                    {loading ? <span className="spinner"/> : 'Crear mi cuenta'}
                                </button>
                            </form>
                            <div className="login-footer">
                                <Link to="/login" className="forgot-link">Ya tengo cuenta</Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
