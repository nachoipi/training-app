// Single source of truth for UI iconography. Renders an inline 24×24 SVG by
// name from the registry; uses currentColor so nav active state, theme
// switches, and accent overlays propagate automatically. Static per-exercise
// icons (catalog `iconUrl` field) are NOT routed through this — those stay
// as <img src> because their URL is user-supplied data.
import React from 'react';

// Each entry is a function returning the SVG inner shapes — we wrap them in a
// single <svg> with consistent attributes so every icon looks visually
// uniform (line-art, stroke-only, rounded caps).
const REGISTRY = {
    // Calendars / time
    calendar: () => (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
        </>
    ),
    'calendar-check': () => (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
            <path d="M9 14l2 2 4-4" />
        </>
    ),

    // Catalog / planning
    clipboard: () => (
        <>
            <rect x="6" y="4" width="12" height="17" rx="2" />
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <line x1="9" y1="11" x2="15" y2="11" />
            <line x1="9" y1="15" x2="13" y2="15" />
        </>
    ),

    // Progress / charts
    'chart-up': () => (
        <>
            <path d="M3 21h18" />
            <path d="M5 17l5-6 4 4 6-8" />
            <path d="M14 7h6v6" />
        </>
    ),

    // Strength / exercises
    dumbbell: () => (
        <>
            <rect x="2" y="9" width="2.5" height="6" rx="0.8" />
            <rect x="4.5" y="10.5" width="1.8" height="3" rx="0.5" />
            <line x1="6.3" y1="12" x2="17.7" y2="12" />
            <rect x="17.7" y="10.5" width="1.8" height="3" rx="0.5" />
            <rect x="19.5" y="9" width="2.5" height="6" rx="0.8" />
        </>
    ),
    barbell: () => (
        <>
            <rect x="2" y="8" width="2" height="8" rx="0.6" />
            <rect x="4" y="10" width="1.6" height="4" rx="0.4" />
            <line x1="5.6" y1="12" x2="18.4" y2="12" />
            <rect x="18.4" y="10" width="1.6" height="4" rx="0.4" />
            <rect x="20" y="8" width="2" height="8" rx="0.6" />
        </>
    ),

    // People
    users: () => (
        <>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
            <circle cx="17" cy="9.5" r="2.5" />
            <path d="M16 14.2c2.8 0.3 5 2.6 5 5.8" />
        </>
    ),

    // Cardio / mobility / intensity
    run: () => (
        <>
            <circle cx="15" cy="5" r="2" />
            <path d="M5 21l3-5 3 2 2-4 3 3 4-2" />
            <path d="M11 18l-2-4 3-3 3 3 2-1" />
        </>
    ),
    stretch: () => (
        <>
            <circle cx="12" cy="4" r="2" />
            <path d="M12 6v6" />
            <path d="M6 9l6 3 6-3" />
            <path d="M12 12l-3 9" />
            <path d="M12 12l3 9" />
        </>
    ),
    zzz: () => (
        <>
            <path d="M7 6h6l-6 7h6" />
            <path d="M14 11h4l-4 5h4" />
        </>
    ),
    flame: () => (
        <>
            <path d="M12 3c0 4-4 5-4 9a4 4 0 0 0 8 0c0-2-1-3-2-4 1 3-1 4-2 4 0-3 3-5 0-9z" />
        </>
    ),
    bolt: () => (
        <>
            <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />
        </>
    ),
    flex: () => (
        <>
            <path d="M4 14c2-3 5-3 7-1" />
            <path d="M11 13c2 0 5 1 6 4" />
            <path d="M11 13a3 3 0 0 0 5-2c-1 1-3 1-5 2z" />
            <path d="M17 17c2-1 3-3 3-5" />
        </>
    ),

    // Inline / UI chrome
    search: () => (
        <>
            <circle cx="11" cy="11" r="6" />
            <line x1="15.5" y1="15.5" x2="21" y2="21" />
        </>
    ),
    wrench: () => (
        <>
            <path d="M14.7 6.3a5 5 0 0 0 6.6 6.6L13 21l-3-3z" />
            <path d="M14 10l-7 7" />
        </>
    ),
    close: () => (
        <>
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
        </>
    ),
    check: () => (
        <path d="M5 13l4 4 10-10" />
    ),
    'cube-3d': () => (
        <>
            <path d="M12 3l9 5v8l-9 5-9-5V8z" />
            <path d="M3 8l9 5 9-5" />
            <line x1="12" y1="13" x2="12" y2="21" />
        </>
    ),
    'play-circle': () => (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M10 8l6 4-6 4z" />
        </>
    ),
    trash: () => (
        <>
            <line x1="4" y1="7" x2="20" y2="7" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
            <line x1="10" y1="11" x2="10" y2="18" />
            <line x1="14" y1="11" x2="14" y2="18" />
        </>
    ),
    plus: () => (
        <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </>
    ),
    menu: () => (
        <>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
        </>
    ),
};

// Inline SVG by name. Size defaults to 1em so the icon scales with the
// surrounding text node; pass a number for a hard pixel size.
export function Icon({ name, size = '1em', className = '', strokeWidth = 2, ...rest }) {
    const render = REGISTRY[name];
    if (!render) {
        if (typeof console !== 'undefined') {
            // eslint-disable-next-line no-console
            console.warn(`[Icon] unknown name "${name}"`);
        }
        return null;
    }
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`icon ${className}`.trim()}
            aria-hidden={rest['aria-label'] ? undefined : true}
            {...rest}
        >
            {render()}
        </svg>
    );
}
