// Fixed top header strip. Mirrors the sidebar-header height (64px) and sits
// to the right of the sidebar on desktop, full-width on mobile. Shows the
// user's name + role badge on the left of the avatar; clicking anywhere on
// the strip navigates to the 'profile' section.
import React from 'react';
import { Icon } from '../Icon/index.jsx';
import './TopBar.css';

export function TopBar({ user, activeSection, onNavigate, sidebarCollapsed }) {
    if (!user) return null;
    const active = activeSection === 'profile';
    const initial = user.avatar || (user.name?.[0] || '?').toUpperCase();
    const roleIcon = user.role === 'trainer' ? 'bolt' : 'flex';
    const roleText = user.role === 'trainer' ? 'Entrenador' : 'Atleta';

    return (
        <header
            className={`top-bar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
            onClick={() => onNavigate('profile')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('profile'); }}
            title="Mi Cuenta"
            aria-label="Mi Cuenta"
        >
            <div className="top-bar-identity">
                <span className="top-bar-name">{user.name}</span>
                <span className="top-bar-role"><Icon name={roleIcon} size={14} /> {roleText}</span>
            </div>
            <div className={`top-bar-avatar ${active ? 'active' : ''}`}>
                {initial}
            </div>
        </header>
    );
}
