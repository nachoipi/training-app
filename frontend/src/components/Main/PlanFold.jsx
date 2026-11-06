// Collapsible wrapper for an archived plan on the athlete screens (Mi Plan / Mis Sesiones):
// a plan whose sessions are all done and reviewed by the coach shows only its header until opened.
import React, { useState } from 'react';

export function PlanFold({ name, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="plan-sessions-group">
            <button className="plan-group-head is-completed" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <svg className="chev" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {name}
                <span className="plan-group-meta">Completada · revisada</span>
            </button>
            {open && children}
        </div>
    );
}
