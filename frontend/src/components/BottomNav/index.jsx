import React from 'react';
import './BottomNav.css';

export function BottomNav({ user, activeSection, onNavigate }) {
    const isAthlete = user && user.role === 'athlete';
    if (!isAthlete) return null;

    const navItems = [
        { section: 'my-plan',     icon: '📅', label: 'Mi Plan' },
        { section: 'my-sessions', icon: '📆', label: 'Sesiones' },
        { section: 'routines',    icon: '📋', label: 'Rutinas' },
        { section: 'progress',    icon: '📈', label: 'Progreso' },
        { section: 'exercises',   icon: '💪', label: 'Ejercicios' },
    ];

    return (
        <nav className="bottom-nav">
            {navItems.map(item => (
                <button
                    key={item.section}
                    className={`bottom-nav-item ${activeSection === item.section ? 'active' : ''}`}
                    onClick={() => onNavigate(item.section)}
                >
                    <span className="bottom-nav-icon">{item.icon}</span>
                    <span className="bottom-nav-label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}
