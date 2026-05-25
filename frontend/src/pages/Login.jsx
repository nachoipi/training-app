import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, login as doLogin } from '../services/authService.js';
import '../styles/login.css';

const IconMail = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
);
const IconLock = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
);
const IconEye = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
);
const IconEyeOff = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    </svg>
);
const IconAlert = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);
const IconUser = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4"/>
        <path d="M12 14c-6 0-8 3-8 4h16c0-1-2-4-8-4z"/>
    </svg>
);
const IconGoogle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const DEMO_HINTS = {
    trainer: { email: 'trainer@fitcore.com', label: 'Entrenador' },
    athlete: { email: 'nacho@fitcore.com',   label: 'Atleta' },
};

export default function Login() {
    const navigate = useNavigate();
    const [role,     setRole]     = useState('trainer');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    const [success,  setSuccess]  = useState(false);

    useEffect(() => {
        if (isAuthenticated()) navigate('/dashboard', { replace: true });
    }, [navigate]);

    const hint = DEMO_HINTS[role];

    function validate() {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Ingresá un email válido.');
            return false;
        }
        if (!password || password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return false;
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!validate()) return;

        setLoading(true);
        try {
            await doLogin(email, password);
            setSuccess(true);
            setTimeout(() => navigate('/dashboard', { replace: true }), 600);
        } catch (err) {
            setError(err.message || 'Credenciales incorrectas.');
        } finally {
            setLoading(false);
        }
    }

    function fillDemo() {
        setEmail(hint.email);
        setPassword('123456');
        setError('');
    }

    return (
        <div className="login-page">
            <div className="layout">
                <div className="panel-left">
                    <div className="deco-ring" style={{ width:'500px', height:'500px', top:'-120px', right:'-200px' }}/>
                    <div className="deco-ring" style={{ width:'300px', height:'300px', top:'-40px',  right:'-80px',  borderColor:'rgba(212,240,60,0.12)' }}/>
                    <div className="deco-ring" style={{ width:'180px', height:'180px', top:'60px',   right:'20px',   borderColor:'rgba(212,240,60,0.18)' }}/>
                    <div className="hero-content">
                        <div className="brand-tag">
                            <div className="brand-dot"/>
                            <span>{role === 'trainer' ? 'Personal Trainer Portal' : 'Athlete Portal'}</span>
                        </div>
                        <h1 className="hero-title">Fit<em>Core</em><br/>Pro</h1>
                        <p className="hero-sub">
                            {role === 'trainer'
                                ? 'Diseñá planes, monitoreá el progreso de tus alumnos y gestioná tu práctica profesional desde un solo lugar.'
                                : 'Seguí tus rutinas, registrá cada sesión y visualizá tu progreso en tiempo real.'}
                        </p>
                        <div className="stats-row">
                            <div className="stat">
                                <span className="stat-value">2.4k</span>
                                <span className="stat-label">Entrenadores activos</span>
                            </div>
                            <div className="stat-divider"/>
                            <div className="stat">
                                <span className="stat-value">18k</span>
                                <span className="stat-label">Alumnos registrados</span>
                            </div>
                            <div className="stat-divider"/>
                            <div className="stat">
                                <span className="stat-value">340k</span>
                                <span className="stat-label">Entrenamientos completados</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel-right">
                    <div className="login-header fade-in">
                        <span className="login-label">Acceso</span>
                        <h2 className="login-title">
                            Hola,<br/>
                            <span className="muted">{role === 'trainer' ? 'Entrenador' : 'Atleta'}</span>
                        </h2>
                    </div>

                    <div className="role-tabs fade-in">
                        <button
                            type="button"
                            className={`role-tab${role === 'trainer' ? ' active' : ''}`}
                            onClick={() => { setRole('trainer'); setError(''); setEmail(''); setPassword(''); }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Entrenador
                        </button>
                        <button
                            type="button"
                            className={`role-tab${role === 'athlete' ? ' active' : ''}`}
                            onClick={() => { setRole('athlete'); setError(''); setEmail(''); setPassword(''); }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="8" r="4"/>
                                <path d="M12 14c-6 0-8 3-8 4h16c0-1-2-4-8-4z"/>
                            </svg>
                            Atleta
                        </button>
                    </div>

                    <div className="hint-box fade-in">
                        Demo: <strong>{hint.email}</strong> / <strong>123456</strong>
                        {' — '}
                        <span
                            style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={fillDemo}
                        >Autocompletar</span>
                    </div>

                    {error && (
                        <div className="error-msg">
                            <IconAlert/> <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">
                                {role === 'trainer' ? 'Email profesional' : 'Email'}
                            </label>
                            <div className="input-wrapper">
                                <span className="input-icon"><IconMail/></span>
                                <input
                                    className={`form-input${error ? ' has-error' : ''}`}
                                    type="email" id="email" autoComplete="email"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Contraseña</label>
                            <div className="input-wrapper">
                                <span className="input-icon"><IconLock/></span>
                                <input
                                    className={`form-input${error ? ' has-error' : ''}`}
                                    type={showPass ? 'text' : 'password'} id="password"
                                    autoComplete="current-password" placeholder="••••••••"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                />
                                <button type="button" className="toggle-pass" onClick={() => setShowPass(s => !s)} aria-label="Mostrar contraseña">
                                    {showPass ? <IconEyeOff/> : <IconEye/>}
                                </button>
                            </div>
                        </div>

                        <div className="form-extras">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/>
                                Recordarme
                            </label>
                            <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
                        </div>

                        <button
                            type="submit"
                            className={`btn-login${success ? ' success' : ''}`}
                            disabled={loading || success}
                        >
                            {success
                                ? '✓ Acceso concedido'
                                : loading
                                    ? <span className="spinner"/>
                                    : 'Ingresar al panel'}
                        </button>
                    </form>

                    <div className="divider">
                        <div className="divider-line"/>
                        <span className="divider-text">o continuar con</span>
                        <div className="divider-line"/>
                    </div>

                    <button className="btn-sso" type="button">
                        <IconGoogle/> Continuar con Google
                    </button>

                    <div className="login-footer">
                        <span className="footer-text">© 2025 FitCore Pro</span>
                        <span className="footer-role">
                            <IconUser/>
                            {role === 'trainer' ? 'Entrenador' : 'Atleta'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
