// Polls /api/inbox/summary for the unread notification + chat counts shown as
// badges in the TopBar. No websockets (single Render service): it polls every
// INBOX_POLL_MS, pauses while the tab is hidden and refetches the moment the
// tab becomes visible again. `refresh` lets panels force an immediate update
// after reading/deleting something.
import { useCallback, useEffect, useState } from 'react';
import { inboxService } from '../services/inboxService.js';

const INBOX_POLL_MS = 25000;

export function useInbox(enabled) {
    const [counts, setCounts] = useState({ notifications: 0, messages: 0 });

    const refresh = useCallback(() => {
        // Errors (offline, expired token) just keep the previous counts.
        return inboxService.summary().then(setCounts).catch(() => {});
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        refresh();
        const tick = () => { if (!document.hidden) refresh(); };
        const timer = setInterval(tick, INBOX_POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [enabled, refresh]);

    return { counts, refresh };
}
