import React from 'react';

export function Header({ user, activeSection, onNavigate, onLogout, collapsed, onToggle, theme, onToggleTheme }) {
    const isTrainer = user && user.role === 'trainer';
    const isAthlete = user && user.role === 'athlete';

    const navItems = [
        ...(isTrainer ? [{ section: 'athletes', icon: '👥', label: 'Alumnos' }] : []),
        ...(isAthlete ? [{ section: 'my-plan',  icon: '📅', label: 'Mi Plan' }] : []),
        ...(isAthlete ? [{ section: 'my-sessions', icon: '📆', label: 'Mis Sesiones' }] : []),
        { section: 'routines',  icon: '📋', label: 'Rutinas' },
        { section: 'sessions',  icon: '🏋️', label: 'Registro' },
        { section: 'progress',  icon: '📈', label: 'Progreso' },
        { section: 'exercises', icon: '💪', label: 'Ejercicios' },
    ];

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isAthlete ? 'sidebar--athlete' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-text">FitCore</span>
                </div>
                <button className="sidebar-toggle" onClick={onToggle} title="Colapsar menú">☰</button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <a
                        key={item.section}
                        className={`nav-item ${activeSection === item.section ? 'active' : ''}`}
                        onClick={() => onNavigate(item.section)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </a>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">
                        {user ? (user.avatar || user.name[0].toUpperCase()) : '?'}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{user ? user.name : '—'}</span>
                        <span className="user-role-badge">
                            {user ? (user.role === 'trainer' ? '⚡ Entrenador' : '💪 Atleta') : '—'}
                        </span>
                    </div>
                </div>
                <button
                    className="btn-theme-toggle"
                    onClick={onToggleTheme}
                    title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                    <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                    <span className="btn-theme-toggle-label">
                        {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    </span>
                </button>
                <button className="btn-logout" onClick={onLogout} title="Cerrar sesión">
                    <span>↩</span>
                    <span className="btn-logout-label">Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}
