import React from 'react';
import { Icon } from '../Icon/index.jsx';

// Toast auto-prepends a status icon based on `type` so callers don't embed
// "✓" / "✕" glyphs in their message strings. Keeps copy free of UI noise.
const TOAST_ICON = { success: 'check', error: 'close' };

export function Toast({ message, type, show }) {
    const iconName = TOAST_ICON[type];
    return (
        <div className={`toast ${type} ${show ? 'show' : ''}`}>
            {iconName && <Icon name={iconName} className="toast-icon" />}
            <span className="toast-message">{message}</span>
        </div>
    );
}

// EmptyState accepts either a registry icon name (preferred — renders an
// Icon component) or a raw string/emoji for backward compatibility while we
// migrate consumers.
export function EmptyState({ icon, title, subtitle, onAction, actionLabel }) {
    const looksLikeIconName = typeof icon === 'string' && /^[a-z-]+$/.test(icon);
    return (
        <div className="empty-state">
            <span className="empty-icon">
                {looksLikeIconName ? <Icon name={icon} size={40} /> : icon}
            </span>
            <h3>{title}</h3>
            <p>{subtitle}</p>
            {onAction && (
                <button className="btn btn-primary" onClick={onAction}>{actionLabel}</button>
            )}
        </div>
    );
}

export function StatCard({ value, label, accent }) {
    return (
        <div className={`stat-card ${accent ? `accent-${accent}` : ''}`}>
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
        </div>
    );
}
