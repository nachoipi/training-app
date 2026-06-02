// Mobile bottom navigation. Renders different item sets per role so trainers
// and athletes get the actions they actually use on mobile. CSS is in
// BottomNav.css; the grid auto-fits whatever item count we pass.
import React from 'react';
import './BottomNav.css';

// Profile is reachable via the TopBar avatar, so the bottom nav focuses on
// the work sections.
const ATHLETE_ITEMS = [
    { section: 'my-plan',     icon: '📅', label: 'Mi Plan' },
    { section: 'my-sessions', icon: '📆', label: 'Sesiones' },
    { section: 'routines',    icon: '📋', label: 'Rutinas' },
    { section: 'progress',    icon: '📈', label: 'Progreso' },
    { section: 'exercises',   icon: '💪', label: 'Ejercicios' },
];

// First pass for trainers — these will be refined per the "Mejoras a Coach"
// block in TODO.html.
const TRAINER_ITEMS = [
    { section: 'athletes',  icon: '👥', label: 'Alumnos' },
    { section: 'routines',  icon: '📋', label: 'Rutinas' },
    { section: 'exercises', icon: '💪', label: 'Ejercicios' },
    { section: 'sessions',  icon: '🏋️', label: 'Registro' },
    { section: 'progress',  icon: '📈', label: 'Progreso' },
];

export function BottomNav({ user, activeSection, onNavigate }) {
    if (!user) return null;
    const navItems = user.role === 'trainer' ? TRAINER_ITEMS : ATHLETE_ITEMS;

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
