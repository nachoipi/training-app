// "Mi Perfil" section. Renders the authenticated user's profile and an inline
// edit form for name/email/avatar. Wired into Main/index.jsx under the
// 'profile' section key. On save, lifts the updated user back to Dashboard via
// onProfileUpdated so the sidebar/BottomNav refresh instantly.
import React, { useState } from 'react';
import { userService } from '../../services/userService.js';
import { setCurrentUser, setToken } from '../../services/authService.js';

// Curated emoji grid for the avatar. Matches the DB VARCHAR(8) column and
// avoids platform-specific glyphs that an unconstrained input would allow.
const AVATAR_OPTIONS = [
    '💪','🏋️','🥇','🔥','⚡','🚀',
    '🎯','🦁','🐯','🐺','🐉','🌟',
    '⭐','✨','🥷','🧠','🦾','🥊',
    '🎽','⛹️','🏃','🚴','🤸','🧗',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Profile({ user, onShowToast, onProfileUpdated, theme, onToggleTheme, onLogout }) {
    const [editing, setEditing] = useState(false);
    const [name,   setName]   = useState(user?.name   || '');
    const [email,  setEmail]  = useState(user?.email  || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [saving, setSaving] = useState(false);

    if (!user) {
        return (
            <section className="section">
                <p className="profile-empty">Cargando perfil…</p>
            </section>
        );
    }

    function startEdit() {
        setName(user.name || '');
        setEmail(user.email || '');
        setAvatar(user.avatar || '');
        setEditing(true);
    }

    function cancelEdit() {
        setEditing(false);
    }

    async function handleSave(e) {
        e.preventDefault();
        const cleanName  = name.trim();
        const cleanEmail = email.trim();
        if (!cleanName) {
            onShowToast('El nombre es requerido.', 'error');
            return;
        }
        if (!EMAIL_RE.test(cleanEmail)) {
            onShowToast('Email inválido.', 'error');
            return;
        }
        setSaving(true);
        try {
            // Backend returns { user, token } — the token has fresh claims so
            // req.user stays in sync with the DB after the update.
            const { user: updated, token } = await userService.updateMe({
                name: cleanName,
                email: cleanEmail,
                avatar,
            });
            setCurrentUser(updated);
            setToken(token);
            onProfileUpdated(updated);
            onShowToast('Perfil actualizado ✓');
            setEditing(false);
        } catch (err) {
            onShowToast(err.message || 'No se pudo actualizar el perfil.', 'error');
        } finally {
            setSaving(false);
        }
    }

    const roleLabel = user.role === 'trainer' ? '⚡ Entrenador' : '💪 Atleta';

    return (
        <section className="section profile-section-page">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar-display">
                        {editing ? avatar : (user.avatar || (user.name?.[0] || '?').toUpperCase())}
                    </div>
                    <div className="profile-identity">
                        <h1 className="profile-title">{editing ? 'Editar perfil' : user.name}</h1>
                        <span className="profile-role">{roleLabel}</span>
                    </div>
                </div>

                {!editing ? (
                    <div className="profile-readonly">
                        <div className="profile-field">
                            <span className="profile-field-label">Nombre</span>
                            <span className="profile-field-value">{user.name}</span>
                        </div>
                        <div className="profile-field">
                            <span className="profile-field-label">Email</span>
                            <span className="profile-field-value">{user.email}</span>
                        </div>
                        <div className="profile-actions">
                            <button className="btn btn-primary" onClick={startEdit}>
                                Editar perfil
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="profile-form" onSubmit={handleSave}>
                        <label className="profile-form-field">
                            <span className="profile-field-label">Nombre</span>
                            <input
                                type="text"
                                value={name}
                                maxLength={120}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </label>

                        <label className="profile-form-field">
                            <span className="profile-field-label">Email</span>
                            <input
                                type="email"
                                value={email}
                                maxLength={255}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </label>

                        <div className="profile-form-field">
                            <span className="profile-field-label">Avatar</span>
                            <div className="profile-avatar-grid">
                                {AVATAR_OPTIONS.map(emo => (
                                    <button
                                        key={emo}
                                        type="button"
                                        className={`profile-avatar-option ${avatar === emo ? 'selected' : ''}`}
                                        onClick={() => setAvatar(emo)}
                                    >
                                        {emo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="profile-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={cancelEdit}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="profile-card profile-prefs">
                <h2 className="profile-prefs-title">Preferencias</h2>
                <div className="profile-prefs-row">
                    <div>
                        <div className="profile-prefs-label">Tema</div>
                        <div className="profile-prefs-hint">
                            {theme === 'dark' ? 'Modo oscuro activo' : 'Modo claro activo'}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onToggleTheme}
                    >
                        {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
                    </button>
                </div>

                <div className="profile-prefs-row">
                    <div>
                        <div className="profile-prefs-label">Sesión</div>
                        <div className="profile-prefs-hint">Cerrar sesión en este dispositivo</div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={onLogout}
                    >
                        ↩ Cerrar sesión
                    </button>
                </div>
            </div>
        </section>
    );
}
