import React from 'react';

export function Toast({ message, type, show }) {
    return (
        <div className={`toast ${type} ${show ? 'show' : ''}`}>
            {message}
        </div>
    );
}

export function EmptyState({ icon, title, subtitle, onAction, actionLabel }) {
    return (
        <div className="empty-state">
            <span className="empty-icon">{icon}</span>
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
