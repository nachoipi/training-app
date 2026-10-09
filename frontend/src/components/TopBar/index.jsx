// Fixed top header strip. Mirrors the sidebar-header height (64px) and sits
// to the right of the sidebar on desktop, full-width on mobile. Left: the
// current screen's title + subtitle (portaled in by SectionTitle.jsx). Right:
// the user's name + role + avatar (clicking them opens 'profile'), then the
// notification bell and chat buttons with unread badges. On mobile (both
// roles) the name/avatar are hidden — the profile entry is the avatar in
// BottomNav — leaving title + bell + chat; see TopBar.css.
import React from 'react';
import { Icon } from '../Icon/index.jsx';
import './TopBar.css';

// Bell / chat button. data-inbox-toggle lets useDismiss ignore these clicks
// (the button toggles its own panel instead of close-then-reopen).
function InboxButton({ icon, label, count, active, onToggle }) {
    return (
        <button
            type="button"
            className={`top-bar-icon-btn ${active ? 'active' : ''}`}
            data-inbox-toggle
            aria-label={count > 0 ? `${label} (${count} sin leer)` : label}
            title={label}
            onClick={onToggle}
        >
            <Icon name={icon} size={22} />
            {count > 0 && <span className="top-bar-badge">{count > 99 ? '99+' : count}</span>}
        </button>
    );
}

export function TopBar({ user, activeSection, onNavigate, sidebarCollapsed, counts, panel, onTogglePanel }) {
    if (!user) return null;
    const active = activeSection === 'profile';
    const initial = user.avatar || (user.name?.[0] || '?').toUpperCase();
    const roleIcon = user.role === 'trainer' ? 'bolt' : 'flex';
    const roleText = user.role === 'trainer' ? 'Entrenador' : 'Atleta';

    return (
        <header className={`top-bar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="top-bar-title" id="top-bar-title" />
            <div
                className="top-bar-profile"
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
            </div>
            <div className="top-bar-actions">
                <InboxButton icon="bell" label="Notificaciones" count={counts?.notifications ?? 0}
                    active={panel === 'notifications'} onToggle={() => onTogglePanel('notifications')} />
                <InboxButton icon="chat" label="Chat" count={counts?.messages ?? 0}
                    active={panel === 'chat'} onToggle={() => onTogglePanel('chat')} />
            </div>
        </header>
    );
}
