// Closes a popover on outside mousedown/touch or Escape. Clicks inside the
// panel (`ref`) or on any element marked data-inbox-toggle (the top-bar bell /
// chat buttons) are ignored, so the toggle buttons can open and close the
// panel themselves without a close-then-reopen flicker.
import { useEffect } from 'react';

export function useDismiss(ref, open, onClose) {
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (ref.current?.contains(e.target)) return;
            if (e.target.closest?.('[data-inbox-toggle]')) return;
            onClose();
        };
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [ref, open, onClose]);
}
