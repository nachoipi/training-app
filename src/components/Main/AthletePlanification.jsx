import React, { useState, useEffect } from 'react';

const BLOCK_LABELS = ['A', 'B', 'C', 'D', 'E'];
const MEDIDA_OPTIONS = ['Distancia', 'Tiempo', 'Peso'];

function makeExercise(blockLabel, position) {
    return {
        position: `${blockLabel}${position}`,
        exerciseId: '',
        exerciseName: '',
        video: '',
        series: '',
        reps: '',
        medida: 'Reps',
        carga: '',
        comentario: '',
    };
}

function makeBlock(label) {
    return { label, exercises: [makeExercise(label, 1), makeExercise(label, 2)] };
}

function makeDay(dayNumber) {
    return { dayNumber, blocks: [makeBlock('A')] };
}

export function AthletePlanification({ athlete, exercises, planification, onBack, onSave, onShowToast }) {
    const [planName, setPlanName] = useState(planification?.name ?? '');
    const [weeks, setWeeks] = useState(planification?.weeks ?? 4);
    const [days, setDays] = useState(planification?.days ?? [makeDay(1), makeDay(2), makeDay(3)]);

    const trainingDays = days.length;

    function setTrainingDays(n) {
        const count = Number(n);
        setDays(prev => {
            if (count > prev.length) {
                const added = Array.from({ length: count - prev.length }, (_, i) => makeDay(prev.length + i + 1));
                return [...prev, ...added];
            }
            return prev.slice(0, count);
        });
    }

    // ── Block operations ──────────────────────────────────────────────
    function addBlock(dayIdx) {
        setDays(prev => prev.map((d, i) => {
            if (i !== dayIdx) return d;
            const usedLabels = d.blocks.map(b => b.label);
            const next = BLOCK_LABELS.find(l => !usedLabels.includes(l));
            if (!next) return d;
            return { ...d, blocks: [...d.blocks, makeBlock(next)] };
        }));
    }

    function removeBlock(dayIdx, blockIdx) {
        setDays(prev => prev.map((d, i) => {
            if (i !== dayIdx) return d;
            return { ...d, blocks: d.blocks.filter((_, bi) => bi !== blockIdx) };
        }));
    }

    // ── Exercise operations ───────────────────────────────────────────
    function addExercise(dayIdx, blockIdx) {
        setDays(prev => prev.map((d, i) => {
            if (i !== dayIdx) return d;
            return {
                ...d,
                blocks: d.blocks.map((b, bi) => {
                    if (bi !== blockIdx) return b;
                    const pos = b.exercises.length + 1;
                    return { ...b, exercises: [...b.exercises, makeExercise(b.label, pos)] };
                }),
            };
        }));
    }

    function removeExercise(dayIdx, blockIdx, exIdx) {
        setDays(prev => prev.map((d, i) => {
            if (i !== dayIdx) return d;
            return {
                ...d,
                blocks: d.blocks.map((b, bi) => {
                    if (bi !== blockIdx) return b;
                    const filtered = b.exercises.filter((_, ei) => ei !== exIdx);
                    const relabeled = filtered.map((e, pos) => ({ ...e, position: `${b.label}${pos + 1}` }));
                    return { ...b, exercises: relabeled };
                }),
            };
        }));
    }

    function updateExercise(dayIdx, blockIdx, exIdx, field, value) {
        setDays(prev => prev.map((d, i) => {
            if (i !== dayIdx) return d;
            return {
                ...d,
                blocks: d.blocks.map((b, bi) => {
                    if (bi !== blockIdx) return b;
                    return {
                        ...b,
                        exercises: b.exercises.map((e, ei) => {
                            if (ei !== exIdx) return e;
                            const updated = { ...e, [field]: value };
                            if (field === 'exerciseId') {
                                const found = exercises.find(ex => ex.id === value);
                                updated.exerciseName = found ? found.name : '';
                            }
                            return updated;
                        }),
                    };
                }),
            };
        }));
    }

    // ── Save ─────────────────────────────────────────────────────────
    function handleSave() {
        if (!planName.trim()) { onShowToast('Ingresá un nombre para el plan', 'error'); return; }
        for (const day of days) {
            for (const block of day.blocks) {
                for (const ex of block.exercises) {
                    const seriesNum = Number(ex.series);
                    if (String(ex.series ?? '').trim() === '' || Number.isNaN(seriesNum) || seriesNum < 1) {
                        onShowToast(`SERIES debe ser mayor a 0 en ${ex.position} (Día ${day.dayNumber})`, 'error');
                        return;
                    }
                    if (String(ex.reps ?? '').trim() === '') {
                        onShowToast(`Falta REPS en ${ex.position} (Día ${day.dayNumber})`, 'error');
                        return;
                    }
                }
            }
        }
        onSave({ id: planification?.id, athleteId: athlete.id, name: planName.trim(), weeks, days });
    }

    return (
        <section className="section">
            {/* Header */}
            <div className="athlete-profile-header">
                <button className="athlete-profile-back-btn" onClick={onBack}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    Volver al Perfil
                </button>
                <div className="athlete-profile-identity">
                    <div className="athlete-avatar athlete-avatar-lg">{athlete.avatar}</div>
                    <div>
                        <div className="athlete-name athlete-profile-name">{athlete.name}</div>
                        <div className="athlete-email">Nueva planificación</div>
                    </div>
                </div>
            </div>

            {/* Config */}
            <div className="planification-config">
                <div className="planification-config-field">
                    <label className="planification-label">Nombre del plan</label>
                    <input
                        className="planification-input"
                        type="text"
                        placeholder="Ej: Plan Mayo 2026"
                        value={planName}
                        onChange={e => setPlanName(e.target.value)}
                    />
                </div>
                <div className="planification-config-field">
                    <label className="planification-label">Semanas</label>
                    <select className="planification-select" value={weeks} onChange={e => setWeeks(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
                <div className="planification-config-field">
                    <label className="planification-label">Días por semana</label>
                    <select className="planification-select" value={trainingDays} onChange={e => setTrainingDays(e.target.value)}>
                        {Array.from({ length: 7 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Weeks */}
            {Array.from({ length: weeks }, (_, weekIdx) => (
                <div key={weekIdx} className="planification-week">
                    <div className="planification-week-header">
                        <span className="planification-week-label">SEMANA {weekIdx + 1}</span>
                    </div>

                    {days.map((day, dayIdx) => (
                <div key={dayIdx} className="planification-day">
                    <div className="planification-day-header">
                        <span className="planification-day-label">DÍA {day.dayNumber}</span>
                        {day.blocks.length < BLOCK_LABELS.length && (
                            <button className="btn btn-secondary btn-sm" onClick={() => addBlock(dayIdx)}>
                                + Bloque
                            </button>
                        )}
                    </div>

                    {day.blocks.map((block, blockIdx) => (
                        <div key={blockIdx} className="planification-block">
                            <div className="planification-block-header">
                                <span className="planification-block-label">Bloque {block.label}</span>
                                {day.blocks.length > 1 && (
                                    <button className="planification-remove-btn" onClick={() => removeBlock(dayIdx, blockIdx)} title="Quitar bloque">×</button>
                                )}
                            </div>

                            <div className="planification-exercise-header">
                                <span></span>
                                <span>Ejercicio</span>
                                <span>Video</span>
                                <span>Series</span>
                                <span>Reps</span>
                                <span>Medida</span>
                                <span>Carga</span>
                                <span>Comentario</span>
                                <span></span>
                            </div>

                            {block.exercises.map((ex, exIdx) => (
                                <div key={exIdx} className="planification-exercise-row">
                                    <div className="planification-exercise-position">{ex.position}</div>
                                    <select
                                        className="planification-select planification-exercise-select"
                                        value={ex.exerciseId}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'exerciseId', e.target.value)}
                                    >
                                        <option value="">Seleccionar ejercicio...</option>
                                        {exercises.map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        className="planification-input planification-video-input"
                                        type="text"
                                        placeholder="Video URL"
                                        value={ex.video ?? ''}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'video', e.target.value)}
                                    />
                                    <input
                                        className="planification-input planification-num-input"
                                        type="number"
                                        min="1"
                                        placeholder="3"
                                        value={ex.series ?? ''}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'series', e.target.value)}
                                    />
                                    <input
                                        className="planification-input planification-num-input"
                                        type="text"
                                        placeholder='8 o 8,10,12'
                                        value={ex.reps ?? ''}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'reps', e.target.value)}
                                    />
                                    <select
                                        className="planification-select planification-medida-select"
                                        value={ex.medida ?? ''}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'medida', e.target.value)}
                                    >
                                        <option value="">Seleccionar</option>
                                        {MEDIDA_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <input
                                        className="planification-input planification-num-input"
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0"
                                        value={ex.carga ?? ''}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'carga', e.target.value)}
                                    />
                                    <input
                                        className="planification-input planification-comment-input"
                                        type="text"
                                        placeholder="Comentario"
                                        value={ex.comentario ?? ''}
                                        onChange={e => updateExercise(dayIdx, blockIdx, exIdx, 'comentario', e.target.value)}
                                    />
                                    {block.exercises.length > 1 && (
                                        <button className="planification-remove-btn" onClick={() => removeExercise(dayIdx, blockIdx, exIdx)} title="Quitar ejercicio">×</button>
                                    )}
                                </div>
                            ))}

                            <button className="planification-add-exercise-btn" onClick={() => addExercise(dayIdx, blockIdx)}>
                                + Ejercicio
                            </button>
                        </div>
                    ))}
                </div>
                    ))}
                </div>
            ))}

            {/* Footer */}
            <div className="planification-footer">
                <button className="btn btn-secondary" onClick={onBack}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave}>Guardar Planificación</button>
            </div>
        </section>
    );
}
