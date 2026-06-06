// Mobile bottom navigation. Renders different item sets per role so trainers
// and athletes get the actions they actually use on mobile. CSS is in
// BottomNav.css; the grid auto-fits whatever item count we pass.
import React from 'react';
import { Icon } from '../Icon/index.jsx';
import './BottomNav.css';

// Profile is reachable via the TopBar avatar, so the bottom nav focuses on
// the work sections. Icon names point at components/Icon's registry.
const ATHLETE_ITEMS = [
    { section: 'my-plan',     icon: 'calendar',       label: 'Mi Plan' },
    { section: 'my-sessions', icon: 'calendar-check', label: 'Sesiones' },
    { section: 'routines',    icon: 'clipboard',      label: 'Rutinas' },
    { section: 'progress',    icon: 'chart-up',       label: 'Progreso' },
    { section: 'exercises',   icon: 'dumbbell',       label: 'Ejercicios' },
];

// First pass for trainers — these will be refined per the "Mejoras a Coach"
// block in TODO.html.
const TRAINER_ITEMS = [
    { section: 'athletes',  icon: 'users',     label: 'Alumnos' },
    { section: 'routines',  icon: 'clipboard', label: 'Rutinas' },
    { section: 'exercises', icon: 'dumbbell',  label: 'Ejercicios' },
    { section: 'sessions',  icon: 'barbell',   label: 'Registro' },
    { section: 'progress',  icon: 'chart-up',  label: 'Progreso' },
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
                    <span className="bottom-nav-icon"><Icon name={item.icon} size={22} /></span>
                    <span className="bottom-nav-label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}
