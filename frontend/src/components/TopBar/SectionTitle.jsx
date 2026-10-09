// Renders a screen's title + subtitle INTO the TopBar (via a portal into the
// #top-bar-title slot) instead of inside the page, so the page doesn't spend a
// header row on it. Each section screen mounts one of these; when the screen
// unmounts the title disappears with it. Screens with their own header (Back
// button, profile, session detail) simply don't use it and the slot stays empty.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function SectionTitle({ title, subtitle }) {
    const [slot, setSlot] = useState(null);
    // The slot lives in <TopBar>, rendered after <Main>; look it up after mount
    // and keep trying until it exists (it won't before the user is loaded).
    useEffect(() => {
        if (!slot) setSlot(document.getElementById('top-bar-title'));
    });
    if (!slot) return null;
    return createPortal(
        <>
            <h1 className="top-bar-title-text">{title}</h1>
            {subtitle && <p className="top-bar-title-sub">{subtitle}</p>}
        </>,
        slot
    );
}
