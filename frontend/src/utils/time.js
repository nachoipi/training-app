// Small time helpers for the notification and chat panels.

// Short Spanish relative time: "ahora", "hace 5 min", "hace 3 h", "hace 2 d",
// falling back to a dd/mm date after a week.
export function timeAgo(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `hace ${d} d`;
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// HH:mm for chat bubbles.
export function clock(iso) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}
