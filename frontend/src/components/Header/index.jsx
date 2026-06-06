// Desktop sidebar navigation. Icon names come from components/Icon's registry
// so every nav entry shares the line-art style with the rest of the app.
import React from 'react';
import { Icon } from '../Icon/index.jsx';

export function Header({ user, activeSection, onNavigate, collapsed, onToggle }) {
    const isTrainer = user && user.role === 'trainer';
    const isAthlete = user && user.role === 'athlete';

    const navItems = [
        ...(isTrainer ? [{ section: 'athletes',    icon: 'users',          label: 'Alumnos' }] : []),
        ...(isAthlete ? [{ section: 'my-plan',     icon: 'calendar',       label: 'Mi Plan' }] : []),
        ...(isAthlete ? [{ section: 'my-sessions', icon: 'calendar-check', label: 'Mis Sesiones' }] : []),
        { section: 'routines',  icon: 'clipboard', label: 'Rutinas' },
        { section: 'sessions',  icon: 'barbell',   label: 'Registro' },
        { section: 'progress',  icon: 'chart-up',  label: 'Progreso' },
        { section: 'exercises', icon: 'dumbbell',  label: 'Ejercicios' },
    ];

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon"><Icon name="bolt" size={20} /></span>
                    <span className="logo-text">FitCore</span>
                </div>
                <button className="sidebar-toggle" onClick={onToggle} title="Colapsar menú" aria-label="Colapsar menú">
                    <Icon name="menu" size={18} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <a
                        key={item.section}
                        className={`nav-item ${activeSection === item.section ? 'active' : ''}`}
                        onClick={() => onNavigate(item.section)}
                    >
                        <span className="nav-icon"><Icon name={item.icon} size={20} /></span>
                        <span className="nav-label">{item.label}</span>
                    </a>
                ))}
            </nav>

        </aside>
    );
}
