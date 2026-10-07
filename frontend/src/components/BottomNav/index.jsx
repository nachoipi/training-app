// Mobile bottom navigation. Renders different item sets per role so trainers
// and athletes get the actions they actually use on mobile. CSS is in
// BottomNav.css; the grid auto-fits whatever item count we pass.
import React from 'react';
import { Icon } from '../Icon/index.jsx';
import './BottomNav.css';

// Athletes have no TopBar on mobile, so their profile entry point is the round
// avatar button rendered as the last tab (see below). Trainers still use the
// TopBar avatar. Icon names point at components/Icon's registry.
const ATHLETE_ITEMS = [
    // Mis Sesiones has no tab here; it is reached from the Inicio dashboard link.
    { section: 'my-dashboard', icon: 'home',          label: 'Inicio' },
    { section: 'my-plan',     icon: 'calendar',       label: 'Mi Plan' },
    { section: 'routines',    icon: 'clipboard',      label: 'Rutinas' },
    { section: 'progress',    icon: 'chart-up',       label: 'Progreso' },
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
    const isTrainer = user.role === 'trainer';
    const navItems = isTrainer ? TRAINER_ITEMS : ATHLETE_ITEMS;
    // Same initial/emoji fallback the TopBar uses, so the avatar looks identical.
    const initial = user.avatar || (user.name?.[0] || '?').toUpperCase();

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
            {!isTrainer && (
                <button
                    className={`bottom-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
                    onClick={() => onNavigate('profile')}
                    title="Mi Cuenta"
                    aria-label="Mi Cuenta"
                >
                    <span className="bottom-nav-avatar">{initial}</span>
                </button>
            )}
        </nav>
    );
}
