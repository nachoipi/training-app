import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/helpers.js';
import { StatCard } from '../Common/index.jsx';
import { userService } from '../../services/userService.js';

export function AthletesSection({ onShowToast, onOpenAthleteProfile }) {
    const [viewMode, setViewMode] = useState('list');
    const [athletes, setAthletes] = useState([]);

    useEffect(() => {
        userService.listAthletes()
            .then(r => setAthletes(r.data))
            .catch(err => onShowToast && onShowToast(err.message, 'error'));
    }, []);

    const today = new Date().toISOString().slice(0, 10);
    const activeToday = athletes.filter(a => a.lastSession === today).length;
    const totalSessions = athletes.reduce((s, a) => s + a.sessions, 0);

    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Alumnos</h1>
                    <p className="section-subtitle">Gestioná tus atletas y su progreso</p>
                </div>
                <div className="section-header-actions">
                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Vista grilla"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
                            </svg>
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Vista lista"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
                                <rect x="1" y="12" width="14" height="2" rx="1"/>
                            </svg>
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={() => onShowToast('Próximamente: invitar nuevo alumno')}>
                        + Agregar Alumno
                    </button>
                </div>
            </div>

            <div className="stats-row">
                <StatCard value={athletes.length} label="Alumnos activos" accent="lime" />
                <StatCard value={activeToday} label="Entrenaron hoy" accent="green" />
                <StatCard value={totalSessions} label="Sesiones totales" accent="blue" />
            </div>

            {viewMode === 'grid' ? (
                <div className="athletes-grid">
                    {athletes.map(a => (
                        <div key={a.id} className="athlete-card">
                            <div className="athlete-card-top">
                                <div className="athlete-avatar">{a.avatar}</div>
                                <div className="athlete-info">
                                    <div className="athlete-name">{a.name}</div>
                                    <div className="athlete-email">{a.email}</div>
                                </div>
                            </div>
                            <div className="athlete-stats">
                                <div className="athlete-stat">
                                    <span className="athlete-stat-val">{a.sessions}</span>
                                    <span className="athlete-stat-lbl">Sesiones</span>
                                </div>
                                <div className="athlete-stat">
                                    <span className="athlete-stat-val">{a.routines}</span>
                                    <span className="athlete-stat-lbl">Rutinas</span>
                                </div>
                            </div>
                            <div className="athlete-last-session">
                                Última sesión: <strong>{formatDate(a.lastSession)}</strong>
                            </div>
                            <div className="athlete-card-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => onOpenAthleteProfile(a)}>
                                    Ver Alumno
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="athletes-list">
                    <div className="athletes-list-header">
                        <span>Alumno</span>
                        <span>Sesiones</span>
                        <span>Rutinas</span>
                        <span>Última sesión</span>
                        <span></span>
                    </div>
                    {athletes.map(a => (
                        <div key={a.id} className="athlete-row">
                            <div className="athlete-row-identity">
                                <div className="athlete-avatar athlete-avatar-sm">{a.avatar}</div>
                                <div className="athlete-info">
                                    <div className="athlete-name">{a.name}</div>
                                    <div className="athlete-email">{a.email}</div>
                                </div>
                            </div>
                            <div className="athlete-row-stat">
                                <span className="athlete-stat-val">{a.sessions}</span>
                            </div>
                            <div className="athlete-row-stat">
                                <span className="athlete-stat-val">{a.routines}</span>
                            </div>
                            <div className="athlete-row-date">
                                {formatDate(a.lastSession)}
                            </div>
                            <div className="athlete-row-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => onOpenAthleteProfile(a)}>
                                    Ver Alumno
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
