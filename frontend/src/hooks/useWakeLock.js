// Best-effort screen wake lock for live training. While `active` is true it asks the browser to
// keep the screen on (Screen Wake Lock API) so the session clock and auto-save are not cut by the
// device going to sleep. Used by AthleteMySession; silently does nothing where the API is missing
// (older browsers, non-HTTPS origins) or the request is refused (e.g. low battery).
import { useEffect } from 'react';

export function useWakeLock(active) {
    useEffect(() => {
        if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
        let sentinel = null;
        let cancelled = false;

        async function acquire() {
            try {
                const lock = await navigator.wakeLock.request('screen');
                // The effect may have been cleaned up while the request was pending.
                if (cancelled) { lock.release().catch(() => {}); return; }
                sentinel = lock;
            } catch { /* refused: nothing to do, the session still works */ }
        }
        // The browser releases the lock whenever the tab is hidden, so it must be asked for again
        // when the athlete comes back.
        function onVisible() {
            if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) acquire();
        }

        acquire();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            sentinel?.release().catch(() => {});
        };
    }, [active]);
}
