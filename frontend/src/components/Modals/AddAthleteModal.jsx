// "Agregar alumno" modal (trainer, Alumnos screen). Two paths:
//   1. Link an athlete that already has a profile but no trainer (by email).
//   2. Create an invitation link for someone without a profile; pending links
//      are listed and can be revoked (the raw link is only shown once).
import React, { useEffect, useState } from 'react';
import { userService } from '../../services/userService.js';
import { Icon } from '../Icon/index.jsx';

export function AddAthleteModal({ open, onClose, onLinked, onShowToast }) {
    const [tab, setTab] = useState('email');
    const [email, setEmail] = useState('');
    const [invName, setInvName] = useState('');
    const [invEmail, setInvEmail] = useState('');
    const [link, setLink] = useState('');
    const [pending, setPending] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setTab('email'); setEmail(''); setInvName(''); setInvEmail(''); setLink(''); setError('');
        userService.listInvites().then(r => setPending(r.data)).catch(() => {});
    }, [open]);

    if (!open) return null;

    async function handleLink(e) {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            const { athlete } = await userService.linkAthlete(email.trim());
            onShowToast(`${athlete.name} ahora es tu alumno`);
            onLinked();
            onClose();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    async function handleInvite(e) {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            const r = await userService.createInvite({ name: invName.trim(), email: invEmail.trim() });
            setLink(r.link);
            setPending(p => [r.invite, ...p]);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    async function copy() {
        try { await navigator.clipboard.writeText(link); onShowToast('Link copiado'); }
        catch { onShowToast('No se pudo copiar, copialo manualmente', 'error'); }
    }

    async function revoke(id) {
        try {
            await userService.revokeInvite(id);
            setPending(p => p.filter(i => i.id !== id));
        } catch (err) { onShowToast(err.message, 'error'); }
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>Agregar alumno</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                    <div className="view-toggle" style={{ marginBottom: 16 }}>
                        <button className={`view-toggle-btn ${tab === 'email' ? 'active' : ''}`}
                            style={{ width: 'auto', padding: '0 14px' }} onClick={() => { setTab('email'); setError(''); }}>
                            Ya tiene perfil
                        </button>
                        <button className={`view-toggle-btn ${tab === 'invite' ? 'active' : ''}`}
                            style={{ width: 'auto', padding: '0 14px' }} onClick={() => { setTab('invite'); setError(''); }}>
                            Invitar por link
                        </button>
                    </div>

                    {error && <div role="alert" style={{ marginBottom: 12, color: 'var(--danger, #f0553c)' }}>{error}</div>}

                    {tab === 'email' ? (
                        <form onSubmit={handleLink}>
                            <p style={{ marginBottom: 12, opacity: 0.8 }}>
                                Si tu alumno ya tiene una cuenta y todavía no tiene entrenador, agregalo con su email.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Email del alumno</label>
                                <input className="form-input" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)} placeholder="alumno@correo.com" required />
                            </div>
                            <button className="btn btn-primary" disabled={busy || !email.trim()}>Agregar alumno</button>
                        </form>
                    ) : (
                        <>
                            <form onSubmit={handleInvite}>
                                <p style={{ marginBottom: 12, opacity: 0.8 }}>
                                    Generá un link de un solo uso (válido 7 días). Tu alumno crea su perfil y queda vinculado a vos.
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Nombre (opcional)</label>
                                    <input className="form-input" value={invName} onChange={e => setInvName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email (opcional, lo deja fijo en el registro)</label>
                                    <input className="form-input" type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" disabled={busy}>Generar link</button>
                            </form>

                            {link && (
                                <div className="form-group" style={{ marginTop: 16 }}>
                                    <label className="form-label">Link de invitación (se muestra una sola vez)</label>
                                    <input className="form-input" readOnly value={link} onFocus={e => e.target.select()} />
                                    <button className="btn btn-light" style={{ marginTop: 8 }} onClick={copy}>Copiar link</button>
                                </div>
                            )}

                            {pending.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <label className="form-label">Invitaciones pendientes</label>
                                    {pending.map(i => (
                                        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                            <span>
                                                {i.name || i.email || 'Sin datos'}{' '}
                                                <small style={{ opacity: 0.6 }}>vence {new Date(i.expiresAt).toLocaleDateString('es-AR')}</small>
                                            </span>
                                            <button className="btn btn-light btn-sm" onClick={() => revoke(i.id)}>Revocar</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
