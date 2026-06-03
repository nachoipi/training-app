import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, login as doLogin } from '../services/authService.js';
import '../styles/login.css';

// --- Inline SVG icon components ---
// Kept inline (instead of an icon library) to avoid bundle bloat for just these few icons.

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
// Shown when password is hidden; clicking it toggles to IconEyeOff
const IconEye = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
);
// Shown when password is visible; clicking it hides the password again
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
// Tiny user avatar used in the footer role badge
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

// Hardcoded credentials shown in the hint box so testers/new devs can log in quickly
// without needing real accounts set up locally. Password is always '123456'.
//   - `demo` rows point at the "realistic" accounts (trainer@/nacho@). These are NOT
//     seeded anymore — register them through the app the first time you need them,
//     then reuse for end-to-end testing with real data.
//   - `test` rows point at the accounts seeded by database/seed.sql (test_trainer@,
//     test_athlete@). Use these for throwaway/automated checks.
const DEMO_HINTS = {
    trainer: {
        demo: { email: 'trainer@fitcore.com',      label: 'Demo' },
        test: { email: 'test_trainer@fitcore.com', label: 'Test' },
    },
    athlete: {
        demo: { email: 'nacho@fitcore.com',        label: 'Demo' },
        test: { email: 'test_athlete@fitcore.com', label: 'Test' },
    },
};

export default function Login() {
    const navigate = useNavigate();

    // `role` drives the copy shown on the left panel and the demo credentials hint
    const [role,     setRole]     = useState('trainer');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    // Toggles the password input between type="password" and type="text"
    const [showPass, setShowPass] = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    // Briefly true after a successful login to show the green "✓ Acceso concedido" state
    // before the redirect fires
    const [success,  setSuccess]  = useState(false);

    // Redirect already-authenticated users away from the login page immediately
    useEffect(() => {
        if (isAuthenticated()) navigate('/dashboard', { replace: true });
    }, [navigate]);

    // The hint pair (demo + test) for the currently selected role
    const hints = DEMO_HINTS[role];

    // Client-side validation before hitting the API — avoids a round trip for obvious errors
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
            // Show success state briefly so the user gets visual feedback before navigation
            setSuccess(true);
            setTimeout(() => navigate('/dashboard', { replace: true }), 600);
        } catch (err) {
            setError(err.message || 'Credenciales incorrectas.');
        } finally {
            setLoading(false);
        }
    }

    // Pre-fills the form with one of the hint accounts (demo or test) for the active
    // role so testers don't have to type them manually
    function fillHint(which) {
        setEmail(hints[which].email);
        setPassword('123456');
        setError('');
    }

    return (
        <div className="login-page">
            <div className="layout">
                {/* Left decorative panel — shows branding, tagline, and platform stats.
                    Pure marketing/UX; no interactive logic here. */}
                <div className="panel-left">
                    {/* Layered concentric rings for the background decoration */}
                    <div className="deco-ring" style={{ width:'500px', height:'500px', top:'-120px', right:'-200px' }}/>
                    <div className="deco-ring" style={{ width:'300px', height:'300px', top:'-40px',  right:'-80px',  borderColor:'rgba(212,240,60,0.12)' }}/>
                    <div className="deco-ring" style={{ width:'180px', height:'180px', top:'60px',   right:'20px',   borderColor:'rgba(212,240,60,0.18)' }}/>
                    <div className="hero-content">
                        <div className="brand-tag">
                            <div className="brand-dot"/>
                            <span>{role === 'trainer' ? 'Personal Trainer Portal' : 'Athlete Portal'}</span>
                        </div>
                        <h1 className="hero-title">Fit<em>Core</em><br/>Pro</h1>
                        {/* Tagline changes based on role to speak directly to each user type */}
                        <p className="hero-sub">
                            {role === 'trainer'
                                ? 'Diseñá planes, monitoreá el progreso de tus alumnos y gestioná tu práctica profesional desde un solo lugar.'
                                : 'Seguí tus rutinas, registrá cada sesión y visualizá tu progreso en tiempo real.'}
                        </p>
                        {/* Social-proof stats row */}
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

                {/* Right panel — contains the actual login form */}
                <div className="panel-right">
                    <div className="login-header fade-in">
                        <span className="login-label">Acceso</span>
                        <h2 className="login-title">
                            Hola,<br/>
                            <span className="muted">{role === 'trainer' ? 'Entrenador' : 'Atleta'}</span>
                        </h2>
                    </div>

                    {/* Role selector — switching tabs resets form state to avoid stale credentials */}
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

                    {/* Credentials hint — exposes both the "demo" account (realistic data,
                        not seeded) and the "test" account (seeded by database/seed.sql).
                        Clicking either label prefills the form with that account. */}
                    <div className="hint-box fade-in">
                        <div>
                            {hints.demo.label}: <strong>{hints.demo.email}</strong> / <strong>123456</strong>
                            {' — '}
                            <span
                                style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => fillHint('demo')}
                            >Autocompletar</span>
                        </div>
                        <div>
                            {hints.test.label}: <strong>{hints.test.email}</strong> / <strong>123456</strong>
                            {' — '}
                            <span
                                style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => fillHint('test')}
                            >Autocompletar</span>
                        </div>
                    </div>

                    {/* Inline error banner — only rendered when there is an active error message */}
                    {error && (
                        <div className="error-msg">
                            <IconAlert/> <span>{error}</span>
                        </div>
                    )}

                    {/* noValidate disables native browser validation so we control all error UX */}
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
                                {/* type switches between 'password' and 'text' based on showPass */}
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

                        {/* Button label changes based on state: loading spinner → normal label → success tick */}
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

                    {/* SSO section — Google login is wired up as a separate auth flow */}
                    <div className="divider">
                        <div className="divider-line"/>
                        <span className="divider-text">o continuar con</span>
                        <div className="divider-line"/>
                    </div>

                    <button className="btn-sso" type="button">
                        <IconGoogle/> Continuar con Google
                    </button>

                    {/* Footer shows copyright and a small badge with the active role */}
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
