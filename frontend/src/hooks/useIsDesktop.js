import { useState, useEffect } from 'react';

// True on viewports >= 769px (the same breakpoint planification.css uses for the desktop
// layouts). Subscribes to changes so a window resize re-renders.
export function useIsDesktop() {
    const query = '(min-width: 769px)';
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = e => setMatches(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return matches;
}
