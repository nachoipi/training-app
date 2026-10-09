// Notification centre popover (desktop) / full-screen sheet (mobile), opened
// from the TopBar bell. Lists the caller's unread notifications; clicking one
// deletes it (reading == purging) and asks the Dashboard to navigate to the
// related screen. "Limpiar" purges everything. Re-fetches whenever the polled
// unread count changes while it is open.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/index.jsx';
import { notificationService } from '../../services/notificationService.js';
import { useDismiss } from '../../hooks/useDismiss.js';
import { timeAgo } from '../../utils/time.js';
import './NotificationPanel.css';

const TYPE_ICON = {
    session_completed: 'calendar-check',
    session_reviewed: 'check',
    plan_assigned: 'clipboard',
    plan_updated: 'clipboard',
};

export function NotificationPanel({ open, count, onClose, onSelect, onChanged }) {
    const ref = useRef(null);
    const [items, setItems] = useState([]);
    const [loaded, setLoaded] = useState(false);
    useDismiss(ref, open, onClose);

    useEffect(() => {
        if (!open) { setLoaded(false); return; }
        notificationService.list()
            .then(r => { setItems(r.data); setLoaded(true); })
            .catch(() => setLoaded(true));
    }, [open, count]);

    const handleClick = useCallback(async (n) => {
        // Remove locally first so the UI feels instant; the server delete is idempotent.
        setItems(list => list.filter(x => x.id !== n.id));
        try { await notificationService.remove(n.id); } catch { /* next poll resyncs */ }
        onChanged();
        onSelect(n);
    }, [onChanged, onSelect]);

    async function handleClear() {
        setItems([]);
        try { await notificationService.clear(); } catch { /* next poll resyncs */ }
        onChanged();
    }

    if (!open) return null;
    return (
        <aside className="inbox-panel notif-panel" ref={ref} role="dialog" aria-label="Notificaciones">
            <header className="inbox-panel-head">
                <h3>Notificaciones</h3>
                {items.length > 0 && (
                    <button type="button" className="inbox-link-btn" onClick={handleClear}>Limpiar</button>
                )}
                <button type="button" className="inbox-icon-btn" onClick={onClose} aria-label="Cerrar">
                    <Icon name="close" size={18} />
                </button>
            </header>
            <div className="inbox-panel-body">
                {loaded && items.length === 0 && (
                    <p className="inbox-empty">No tenés notificaciones nuevas.</p>
                )}
                {items.map(n => (
                    <button type="button" key={n.id} className="notif-item" onClick={() => handleClick(n)}>
                        <span className="notif-item-icon"><Icon name={TYPE_ICON[n.type] || 'bell'} size={18} /></span>
                        <span className="notif-item-text">
                            <strong>{n.title}</strong>
                            {n.body && <span>{n.body}</span>}
                        </span>
                        <time className="notif-item-time">{timeAgo(n.createdAt)}</time>
                    </button>
                ))}
            </div>
        </aside>
    );
}
