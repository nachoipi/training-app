// Chat centre popover (desktop) / full-screen sheet (mobile), opened from the
// TopBar chat button. Trainers see a conversation list (their athletes) and
// then a thread; athletes go straight to the thread with their trainer, or an
// empty state when they have no plan yet (= no trainer). Text only, max 1000
// chars. The open thread polls every THREAD_POLL_MS (only while mounted/open);
// opening a thread marks the incoming messages as read.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/index.jsx';
import { chatService } from '../../services/chatService.js';
import { useDismiss } from '../../hooks/useDismiss.js';
import { clock, timeAgo } from '../../utils/time.js';
import '../Notifications/NotificationPanel.css';
import './ChatPanel.css';

const THREAD_POLL_MS = 8000;
const MAX_LEN = 1000;

export function ChatPanel({ open, user, count, onClose, onChanged }) {
    const ref = useRef(null);
    const isTrainer = user?.role === 'trainer';
    const [convs, setConvs] = useState([]);
    const [convsLoaded, setConvsLoaded] = useState(false);
    const [peer, setPeer] = useState(null);        // { id, name, avatar } of the open thread
    const [messages, setMessages] = useState([]);
    const [threadLoaded, setThreadLoaded] = useState(false); // avoids flashing the empty state while loading
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const listEnd = useRef(null);
    const lastId = useRef(0);
    useDismiss(ref, open, onClose);

    // Conversation list; also refreshed when the polled unread count changes.
    useEffect(() => {
        if (!open) { setPeer(null); setMessages([]); setConvsLoaded(false); return; }
        chatService.conversations()
            .then(r => {
                setConvs(r.data);
                setConvsLoaded(true);
                // Athletes have exactly one possible thread: open it directly.
                if (!isTrainer && r.data[0]) setPeer(p => p ?? r.data[0]);
            })
            .catch(() => setConvsLoaded(true));
    }, [open, count, isTrainer]);

    const loadThread = useCallback(async (peerId, reset) => {
        const afterId = reset ? 0 : lastId.current;
        const r = await chatService.messages(peerId, afterId);
        if (r.data.length) {
            lastId.current = r.data[r.data.length - 1].id;
            setMessages(m => (reset ? r.data : [...m, ...r.data.filter(x => !m.some(y => y.id === x.id))]));
            // Anything new from the peer is read as soon as it is on screen.
            if (r.data.some(m => m.senderId === peerId)) {
                chatService.markRead(peerId).then(onChanged).catch(() => {});
            }
        } else if (reset) {
            setMessages([]);
        }
    }, [onChanged]);

    // Thread load + polling while a thread is open.
    useEffect(() => {
        if (!open || !peer) return undefined;
        lastId.current = 0;
        setError('');
        setThreadLoaded(false);
        loadThread(peer.id, true)
            .catch(() => setError('No se pudo cargar la conversación'))
            .finally(() => setThreadLoaded(true));
        const timer = setInterval(() => {
            if (!document.hidden) loadThread(peer.id, false).catch(() => {});
        }, THREAD_POLL_MS);
        return () => clearInterval(timer);
    }, [open, peer, loadThread]);

    useEffect(() => { listEnd.current?.scrollIntoView({ block: 'end' }); }, [messages, peer]);

    async function handleSend(e) {
        e.preventDefault();
        const body = draft.trim();
        if (!body || !peer) return;
        setDraft('');
        try {
            const msg = await chatService.send(peer.id, body);
            lastId.current = Math.max(lastId.current, msg.id);
            setMessages(m => [...m, msg]);
        } catch (err) {
            setDraft(body);
            setError(err.message);
        }
    }

    function handleKey(e) {
        // Enter sends, Shift+Enter inserts a newline.
        if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
    }

    function backToList() { setPeer(null); setMessages([]); onChanged(); }

    if (!open) return null;
    const showList = isTrainer && !peer;
    return (
        <aside className="inbox-panel chat-panel" ref={ref} role="dialog" aria-label="Chat">
            <header className="inbox-panel-head">
                {isTrainer && peer && (
                    <button type="button" className="inbox-icon-btn" onClick={backToList} aria-label="Volver">
                        <Icon name="chevron-left" size={20} />
                    </button>
                )}
                <h3>{peer ? peer.name : 'Chat'}</h3>
                <button type="button" className="inbox-icon-btn" onClick={onClose} aria-label="Cerrar">
                    <Icon name="close" size={18} />
                </button>
            </header>

            {showList && (
                <div className="inbox-panel-body">
                    {convsLoaded && convs.length === 0 && (
                        <p className="inbox-empty">Todavía no tenés alumnos con un plan asignado.</p>
                    )}
                    {convs.map(c => (
                        <button type="button" key={c.id} className="chat-conv" onClick={() => setPeer(c)}>
                            <span className="chat-conv-avatar">{c.avatar || c.name[0]}</span>
                            <span className="chat-conv-text">
                                <strong>{c.name}</strong>
                                <span>{c.lastBody ?? 'Sin mensajes todavía'}</span>
                            </span>
                            <span className="chat-conv-meta">
                                {c.lastAt && <time>{timeAgo(c.lastAt)}</time>}
                                {c.unread > 0 && <span className="inbox-badge">{c.unread}</span>}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {!isTrainer && convsLoaded && !peer && (
                <div className="inbox-panel-body">
                    <p className="inbox-empty">Todavía no tenés un entrenador asignado.</p>
                </div>
            )}

            {peer && (
                <>
                    <div className="inbox-panel-body chat-thread">
                        {threadLoaded && messages.length === 0 && !error && (
                            <p className="inbox-empty">Escribí el primer mensaje.</p>
                        )}
                        {messages.map(m => (
                            <div key={m.id} className={`chat-bubble ${m.senderId === user.id ? 'mine' : 'theirs'}`}>
                                <span>{m.body}</span>
                                <time>{clock(m.createdAt)}</time>
                            </div>
                        ))}
                        <div ref={listEnd} />
                    </div>
                    {error && <p className="chat-error">{error}</p>}
                    <form className="chat-compose" onSubmit={handleSend}>
                        <textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value.slice(0, MAX_LEN))}
                            onKeyDown={handleKey}
                            placeholder="Escribí un mensaje…"
                            rows={1}
                            maxLength={MAX_LEN}
                            aria-label="Mensaje"
                        />
                        <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label="Enviar">
                            <Icon name="send" size={18} />
                        </button>
                        {draft.length > MAX_LEN - 100 && (
                            <span className="chat-counter">{draft.length}/{MAX_LEN}</span>
                        )}
                    </form>
                </>
            )}
        </aside>
    );
}
