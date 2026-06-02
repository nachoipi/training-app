import React from 'react';

export function Header({ user, activeSection, onNavigate, collapsed, onToggle }) {
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
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
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

        </aside>
    );
}
