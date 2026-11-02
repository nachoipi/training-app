import React, { useState, useEffect, useRef } from 'react';

import { EXERCISE_KIND_LABELS, EXERCISE_KIND_COLORS } from '../../utils/constants.js';

// Kind options of the first column: the exercise kinds plus the rest row.
const KIND_OPTIONS = [...Object.entries(EXERCISE_KIND_LABELS), ['rest', 'Descanso']];

import { blockLabelAt, blockTitles } from '../../utils/helpers.js';
const MEDIDA_OPTIONS = ['Distancia', 'Tiempo', 'Peso'];

function makeExercise(blockLabel, position, kind = 'exercise') {
    return {
        position: `${blockLabel}${position}`,
        kind,
        exerciseId: '',
        exerciseName: '',
        secondName: '',
        equipment: '',
        primaryMuscles: [],
        secondaryMuscles: [],
        iconUrl: '',
        videoUrl: '',
        modelImageUrl: '',
        series: '',
        reps: '',
        medida: 'Reps',
        carga: '',
        comentario: '',
    };
}

// A rest between exercises of a block, modelled as an exercise row so it is ordered with them.
// Its length is the row's Carga with Medida Tiempo (m:ss, e.g. "2:00"). Older rests keep a
// free-text `duration` instead (see restLabel in helpers.js). Session screens never log it.
function makeRest(blockLabel, position, time = '2:00') {
    return {
        position: `${blockLabel}${position}`,
        kind: 'rest',
        isRest: true,
        exerciseId: '',
        exerciseName: 'Descanso',
        series: '1',
        reps: '',
        medida: 'Tiempo',
        carga: time,
        comentario: '',
    };
}

function makeBlock(label) {
    return { label, exercises: [makeExercise(label, 1), makeExercise(label, 2)] };
}

function makeDay(dayNumber) {
    return { dayNumber, blocks: [makeBlock('A')] };
}

function deepCopyDays(days) {
    return days.map(day => ({
        ...day,
        blocks: day.blocks.map(block => ({
            ...block,
            exercises: block.exercises.map(ex => ({ ...ex })),
        })),
    }));
}

function initWeekDays(weekCount, templateDays) {
    return Array.from({ length: weekCount }, () => deepCopyDays(templateDays));
}

export function AthletePlanification({ athlete, exercises, routines = [], planification, onBack, onSave, onShowToast }) {
    const [planName, setPlanName] = useState(planification?.name ?? '');
    const [weeks, setWeeks] = useState(planification?.weeks ?? 4);
    const [weekDays, setWeekDays] = useState(() => {
        const savedWeeks = planification?.weeks ?? 4;
        if (planification?.weekDays) return planification.weekDays;
        const template = planification?.days ?? [makeDay(1), makeDay(2), makeDay(3)];
        return initWeekDays(savedWeeks, template);
    });

    // Unsaved-changes guard: `baseline` is the editor state as first loaded; leaving with a
    // different state asks whether to save (Guardar / Salir sin guardar / Seguir editando).
    const baseline = useRef(null);
    const snapshot = JSON.stringify({ planName, weeks, weekDays });
    if (baseline.current === null) baseline.current = snapshot;
    const dirty = snapshot !== baseline.current;
    const [leaveAsk, setLeaveAsk] = useState(false);
    function requestBack() { if (dirty) setLeaveAsk(true); else onBack(); }

    // New plans and drafts can be published from the footer; published ones just save.
    const isPublished = planification?.status === 'published';

    const trainingDays = weekDays[0]?.length ?? 3;

    const [collapsedWeeks, setCollapsedWeeks] = useState({});
    const [collapsedDays, setCollapsedDays] = useState({});
    const [commentOpen, setCommentOpen] = useState({});

    // Day the routine picker is open for: { weekIdx, dayIdx } or null; and the block being dragged.
    const [routinePicker, setRoutinePicker] = useState(null);
    const [dragBlock, setDragBlock] = useState(null);
    // Collapsed blocks, keyed `${weekIdx}-${dayIdx}-${blockIdx}`.
    const [collapsedBlocks, setCollapsedBlocks] = useState({});

    function toggleWeek(weekIdx) {
        setCollapsedWeeks(prev => ({ ...prev, [weekIdx]: !prev[weekIdx] }));
    }

    function toggleDay(weekIdx, dayIdx) {
        const key = `${weekIdx}-${dayIdx}`;
        setCollapsedDays(prev => ({ ...prev, [key]: !prev[key] }));
    }

    function handleWeeksChange(n) {
        const newCount = Number(n);
        setWeeks(newCount);
        setWeekDays(prev => {
            if (newCount > prev.length) {
                const lastWeek = prev[prev.length - 1] ?? [makeDay(1), makeDay(2), makeDay(3)];
                const added = Array.from({ length: newCount - prev.length }, () => deepCopyDays(lastWeek));
                return [...prev, ...added];
            }
            return prev.slice(0, newCount);
        });
    }

    function setTrainingDays(n) {
        const count = Number(n);
        setWeekDays(prev => prev.map(weekDayList => {
            if (count > weekDayList.length) {
                const added = Array.from(
                    { length: count - weekDayList.length },
                    (_, i) => makeDay(weekDayList.length + i + 1)
                );
                return [...weekDayList, ...added];
            }
            return weekDayList.slice(0, count);
        }));
    }

    // ── Day operations ────────────────────────────────────────────────
    function updateDayComment(weekIdx, dayIdx, value) {
        setWeekDays(prev => prev.map((weekDayList, wi) => {
            if (wi !== weekIdx) return weekDayList;
            return weekDayList.map((d, i) => (i === dayIdx ? { ...d, comentario: value } : d));
        }));
    }

    // ── Block operations ──────────────────────────────────────────────
    function addBlock(weekIdx, dayIdx) {
        setWeekDays(prev => prev.map((weekDayList, wi) => {
            if (wi !== weekIdx) return weekDayList;
            return weekDayList.map((d, i) => {
                if (i !== dayIdx) return d;
                const usedLabels = d.blocks.map(b => b.label);
                let n = d.blocks.length;
                while (usedLabels.includes(blockLabelAt(n))) n += 1;
                const next = blockLabelAt(n);
                return { ...d, blocks: [...d.blocks, makeBlock(next)] };
            });
        }));
    }

    function removeBlock(weekIdx, dayIdx, blockIdx) {
        setWeekDays(prev => prev.map((weekDayList, wi) => {
            if (wi !== weekIdx) return weekDayList;
            return weekDayList.map((d, i) => {
                if (i !== dayIdx) return d;
                return { ...d, blocks: d.blocks.filter((_, bi) => bi !== blockIdx) };
            });
        }));
    }

    // ── Exercise operations ───────────────────────────────────────────
    // `kind` is chosen from the block's "+" menu (exercise / warmup / cooldown / other); it is
    // a per-exercise setting and editable afterwards from the row's Tipo select.
    function addExercise(weekIdx, dayIdx, blockIdx, kind = 'exercise') {
        setWeekDays(prev => prev.map((weekDayList, wi) => {
            if (wi !== weekIdx) return weekDayList;
            return weekDayList.map((d, i) => {
                if (i !== dayIdx) return d;
                return {
                    ...d,
                    blocks: d.blocks.map((b, bi) => {
                        if (bi !== blockIdx) return b;
                        const pos = b.exercises.length + 1;
                        return { ...b, exercises: [...b.exercises, makeExercise(b.label, pos, kind)] };
                    }),
                };
            });
        }));
    }

    // Importar rutina (per day): every block of the routine becomes its own NEW block at the
    // end of the day — a routine never lands inside an existing block. Routine rows group by
    // `block` (default 1). Catalog metadata is snapshotted when a row has an exerciseId (or its
    // name matches the catalog); name-only rows keep just the name. If the day's only block is
    // an untouched placeholder it is replaced. It is a copy: later routine edits don't change
    // plans that already imported it.
    function importRoutine(weekIdx, dayIdx, routine) {
        const groups = {};
        (routine.exercises || []).forEach(r => { (groups[r.block ?? 1] ||= []).push(r); });
        const ordered = Object.keys(groups).sort((x, y) => Number(x) - Number(y)).map(k => groups[k]);
        const day = weekDays[weekIdx][dayIdx];
        const isBlank = e => !e.exerciseId && !e.exerciseName && !String(e.reps ?? '').trim();
        const kept = day.blocks.length === 1 && day.blocks[0].exercises.every(isBlank) ? [] : day.blocks;
        const added = ordered.map((rows, n) => {
            const label = blockLabelAt(kept.length + n);
            return {
                label,
                exercises: rows.map((r, i) => {
                    if (r.isRest) return makeRest(label, i + 1, r.duration);
                    const found = exercises.find(ex => ex.id === r.exerciseId) || exercises.find(ex => ex.name === r.name);
                    return {
                        ...makeExercise(label, i + 1, r.kind || 'exercise'),
                        exerciseId: found?.id || '',
                        exerciseName: found?.name || r.name || '',
                        secondName: found?.secondName || '',
                        equipment: found?.equipment || '',
                        primaryMuscles: found?.primaryMuscles || [],
                        secondaryMuscles: found?.secondaryMuscles || [],
                        iconUrl: found?.iconUrl || '',
                        videoUrl: found?.videoUrl || '',
                        modelImageUrl: found?.modelImageUrl || '',
                        series: String(r.sets ?? ''),
                        reps: String(r.reps ?? ''),
                        medida: r.medida || 'Reps',
                        carga: r.carga ?? '',
                        comentario: r.comentario || '',
                    };
                }),
            };
        });
        setWeekDays(prev => prev.map((list, wi) => wi !== weekIdx ? list : list.map((d, i) =>
            i !== dayIdx ? d : { ...d, blocks: [...kept, ...added] })));
        setRoutinePicker(null);
    }

    // Drag & drop reordering of a day's blocks. Blocks are relabelled A, B, C… in their new
    // order and their exercise positions follow (A1, B2…), because `position` is derived from
    // the label and is the join key to session logs.
    function reorderBlocks(weekIdx, dayIdx, from, to) {
        if (from === to) return;
        setWeekDays(prev => prev.map((list, wi) => wi !== weekIdx ? list : list.map((d, i) => {
            if (i !== dayIdx) return d;
            const blocks = [...d.blocks];
            const [moved] = blocks.splice(from, 1);
            blocks.splice(to, 0, moved);
            return {
                ...d,
                blocks: blocks.map((b, bi) => ({
                    ...b,
                    label: blockLabelAt(bi),
                    exercises: b.exercises.map((e, ei) => ({ ...e, position: `${blockLabelAt(bi)}${ei + 1}` })),
                })),
            };
        })));
    }

    // Carga input driven by the row's Medida: the placeholder names the unit (Tiempo m:ss, Peso
    // KG, Distancia MTS); Tiempo takes text (m:ss), everything else a number.
    function cargaInput(ex, weekIdx, dayIdx, blockIdx, exIdx) {
        const placeholder = { Tiempo: 'm:ss', Peso: 'KG', Distancia: 'MTS' }[ex.medida] || '0';
        return (
            <input
                className="planification-input planification-num-input"
                type={ex.medida === 'Tiempo' ? 'text' : 'number'}
                {...(ex.medida === 'Tiempo' ? { inputMode: 'numeric', maxLength: 8 } : { min: 0, step: 'any' })}
                placeholder={placeholder}
                value={ex.carga ?? ''}
                onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'carga', e.target.value)}
            />
        );
    }

    // The position label (A1, B2…) doubles as the Tipo selector: a badge in the kind's colour
    // with a transparent native select on top, so it keeps its small size but opens the list
    // of kinds (including Descanso) when clicked.
    function kindSelect(ex, weekIdx, dayIdx, blockIdx, exIdx) {
        const kind = ex.isRest ? 'rest' : (ex.kind || 'exercise');
        return (
            <label
                className="planification-kind-badge"
                style={{ background: EXERCISE_KIND_COLORS[kind] }}
                title={`Tipo: ${(KIND_OPTIONS.find(([k]) => k === kind) || [])[1] || ''} (clic para cambiar)`}
            >
                {ex.position}
                <select
                    value={kind}
                    onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'kind', e.target.value)}
                >
                    {KIND_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
            </label>
        );
    }

    function removeExercise(weekIdx, dayIdx, blockIdx, exIdx) {
        setWeekDays(prev => prev.map((weekDayList, wi) => {
            if (wi !== weekIdx) return weekDayList;
            return weekDayList.map((d, i) => {
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
            });
        }));
    }

    function updateExercise(weekIdx, dayIdx, blockIdx, exIdx, field, value) {
        setWeekDays(prev => prev.map((weekDayList, wi) => {
            if (wi !== weekIdx) return weekDayList;
            return weekDayList.map((d, i) => {
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
                                // Tiempo takes m:ss and the other medidas numbers, so crossing that line clears Carga.
                                if (field === 'medida' && (value === 'Tiempo') !== (e.medida === 'Tiempo')) updated.carga = '';
                                // Switching the first-column Tipo to/from Descanso converts the row.
                                if (field === 'kind' && value === 'rest') {
                                    Object.assign(updated, {
                                        isRest: true, exerciseId: '', exerciseName: 'Descanso', series: '1', reps: '',
                                        medida: 'Tiempo', carga: e.carga || e.duration || '2:00',
                                    });
                                } else if (field === 'kind' && e.isRest) {
                                    Object.assign(updated, { isRest: false, exerciseName: '', series: '', duration: undefined, medida: 'Reps' });
                                }
                                // When the trainer picks an exercise, snapshot the catalog
                                // metadata onto the planification so the athlete view can
                                // render it offline (after the catalog row may have changed).
                                if (field === 'exerciseId') {
                                    const found = exercises.find(ex => ex.id === value);
                                    updated.exerciseName     = found ? found.name : '';
                                    updated.secondName       = found ? (found.secondName || '') : '';
                                    updated.equipment        = found ? (found.equipment || '') : '';
                                    updated.primaryMuscles   = found ? (found.primaryMuscles || []) : [];
                                    updated.secondaryMuscles = found ? (found.secondaryMuscles || []) : [];
                                    updated.iconUrl          = found ? (found.iconUrl || '') : '';
                                    updated.videoUrl         = found ? (found.videoUrl || '') : '';
                                    updated.modelImageUrl    = found ? (found.modelImageUrl || '') : '';
                                }
                                return updated;
                            }),
                        };
                    }),
                };
            });
        }));
    }

    // ── Save ─────────────────────────────────────────────────────────
    function handleSave(publish = false) {
        if (!planName.trim()) { onShowToast('Ingresá un nombre para el plan', 'error'); return; }
        for (let wi = 0; wi < weekDays.length; wi++) {
            for (const day of weekDays[wi]) {
                for (const block of day.blocks) {
                    for (const ex of block.exercises) {
                        if (ex.isRest) {
                            if (!String(ex.carga ?? ex.duration ?? '').trim()) {
                                onShowToast(`Falta la duración del descanso en ${ex.position} (Semana ${wi + 1}, Día ${day.dayNumber})`, 'error');
                                return;
                            }
                            continue;
                        }
                        const seriesNum = Number(ex.series);
                        if (String(ex.series ?? '').trim() === '' || Number.isNaN(seriesNum) || seriesNum < 1) {
                            onShowToast(`SERIES debe ser mayor a 0 en ${ex.position} (Semana ${wi + 1}, Día ${day.dayNumber})`, 'error');
                            return;
                        }
                        if (String(ex.reps ?? '').trim() === '') {
                            onShowToast(`Falta REPS en ${ex.position} (Semana ${wi + 1}, Día ${day.dayNumber})`, 'error');
                            return;
                        }
                    }
                }
            }
        }
        onSave({ id: planification?.id, athleteId: athlete.id, name: planName.trim(), weeks, weekDays, publish });
    }

    return (
        <section className="section">
            {/* Header */}
            <div className="athlete-profile-header">
                <button className="athlete-profile-back-btn" onClick={requestBack}>
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
                    <select className="planification-select" value={weeks} onChange={e => handleWeeksChange(e.target.value)}>
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
            {Array.from({ length: weeks }, (_, weekIdx) => {
                const isWeekCollapsed = !!collapsedWeeks[weekIdx];
                return (
                <div key={weekIdx} className="planification-week">
                    <div className={`planification-week-header${isWeekCollapsed ? ' planification-week-header--collapsed' : ''}`}>
                        <span className="planification-week-label">SEMANA {weekIdx + 1}</span>
                        <button
                            className="planification-collapse-btn"
                            onClick={() => toggleWeek(weekIdx)}
                            title={isWeekCollapsed ? 'Expandir semana' : 'Colapsar semana'}
                        >
                            {isWeekCollapsed
                                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            }
                        </button>
                    </div>

                    {!isWeekCollapsed && (weekDays[weekIdx] ?? []).map((day, dayIdx) => {
                        const isDayCollapsed = !!collapsedDays[`${weekIdx}-${dayIdx}`];
                        return (
                <div key={dayIdx} className="planification-day">
                    <div className="planification-day-header">
                        <span className="planification-day-label">DÍA {day.dayNumber}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {!isDayCollapsed && routines.length > 0 && (
                                <button className="btn btn-secondary btn-sm" onClick={() => setRoutinePicker({ weekIdx, dayIdx })}>
                                    Importar rutina
                                </button>
                            )}
                            {!isDayCollapsed && (
                                <button className="btn btn-secondary btn-sm" onClick={() => addBlock(weekIdx, dayIdx)}>
                                    + Bloque
                                </button>
                            )}
                            <button
                                className="planification-collapse-btn"
                                onClick={() => toggleDay(weekIdx, dayIdx)}
                                title={isDayCollapsed ? 'Expandir día' : 'Colapsar día'}
                            >
                                {isDayCollapsed
                                    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                }
                            </button>
                        </div>
                    </div>

                    {!isDayCollapsed && day.blocks.map((block, blockIdx) => (
                        <div
                            key={blockIdx}
                            className="planification-block"
                            onDragOver={e => { if (dragBlock && dragBlock.weekIdx === weekIdx && dragBlock.dayIdx === dayIdx) e.preventDefault(); }}
                            onDrop={e => {
                                e.preventDefault();
                                if (dragBlock && dragBlock.weekIdx === weekIdx && dragBlock.dayIdx === dayIdx) reorderBlocks(weekIdx, dayIdx, dragBlock.from, blockIdx);
                                setDragBlock(null);
                            }}
                        >
                            <div className="planification-block-header">
                                {day.blocks.length > 1 && (
                                    <span
                                        className="planification-block-handle"
                                        draggable
                                        title="Arrastrá para reordenar el bloque"
                                        onDragStart={e => {
                                            setDragBlock({ weekIdx, dayIdx, from: blockIdx });
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.dataTransfer.setDragImage(e.currentTarget.closest('.planification-block'), 0, 0);
                                        }}
                                        onDragEnd={() => setDragBlock(null)}
                                    >⠿</span>
                                )}
                                <span className="planification-block-label">{blockTitles(day.blocks)[blockIdx]}</span>
                                <div className="planification-block-actions">
                                    <button
                                        className="planification-collapse-btn"
                                        onClick={() => setCollapsedBlocks(prev => ({ ...prev, [`${weekIdx}-${dayIdx}-${blockIdx}`]: !prev[`${weekIdx}-${dayIdx}-${blockIdx}`] }))}
                                        title={collapsedBlocks[`${weekIdx}-${dayIdx}-${blockIdx}`] ? 'Expandir bloque' : 'Minimizar bloque'}
                                    >
                                        {collapsedBlocks[`${weekIdx}-${dayIdx}-${blockIdx}`]
                                            ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        }
                                    </button>
                                    {day.blocks.length > 1 && (
                                        <button className="planification-remove-btn" onClick={() => removeBlock(weekIdx, dayIdx, blockIdx)} title="Quitar bloque">×</button>
                                    )}
                                </div>
                            </div>

                            {!collapsedBlocks[`${weekIdx}-${dayIdx}-${blockIdx}`] && (<>
                            <div className="planification-exercise-header">
                                <span>Tipo</span>
                                <span>Ejercicio</span>
                                <span>Series</span>
                                <span>Reps</span>
                                <span>Medida</span>
                                <span>Carga</span>
                                <span>Comentario</span>
                                <span></span>
                            </div>

                            {block.exercises.map((ex, exIdx) => ex.isRest ? (
                                <div key={exIdx} className="planification-exercise-row planification-exercise-row--rest">
                                    {kindSelect(ex, weekIdx, dayIdx, blockIdx, exIdx)}
                                    <span className="planification-rest-label" style={{ background: EXERCISE_KIND_COLORS.rest }}>Descanso</span>
                                    <select
                                        className="planification-select planification-medida-select"
                                        value={ex.medida ?? ''}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'medida', e.target.value)}
                                    >
                                        <option value="">Seleccionar</option>
                                        {MEDIDA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    {cargaInput(ex, weekIdx, dayIdx, blockIdx, exIdx)}
                                    <input
                                        className="planification-input planification-comment-input"
                                        type="text" placeholder="Comentario"
                                        value={ex.comentario ?? ''}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'comentario', e.target.value)}
                                    />
                                    <button className="planification-remove-btn" onClick={() => removeExercise(weekIdx, dayIdx, blockIdx, exIdx)} title="Quitar descanso">×</button>
                                </div>
                            ) : (
                                <div key={exIdx} className="planification-exercise-row">
                                    {kindSelect(ex, weekIdx, dayIdx, blockIdx, exIdx)}
                                    <select
                                        className="planification-select planification-exercise-select"
                                        style={{ background: EXERCISE_KIND_COLORS[ex.kind || 'exercise'] }}
                                        value={ex.exerciseId}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'exerciseId', e.target.value)}
                                    >
                                        {/* A name-only exercise (imported from a routine, not in the catalog) shows its name here. */}
                                        <option value="">{ex.exerciseName || 'Seleccionar ejercicio...'}</option>
                                        {exercises.map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        className="planification-input planification-num-input"
                                        type="number"
                                        min="1"
                                        placeholder="3"
                                        value={ex.series ?? ''}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'series', e.target.value)}
                                    />
                                    <input
                                        className="planification-input planification-num-input"
                                        type="text"
                                        placeholder='8 o 8,10,12'
                                        value={ex.reps ?? ''}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'reps', e.target.value)}
                                    />
                                    <select
                                        className="planification-select planification-medida-select"
                                        value={ex.medida ?? ''}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'medida', e.target.value)}
                                    >
                                        <option value="">Seleccionar</option>
                                        {MEDIDA_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    {cargaInput(ex, weekIdx, dayIdx, blockIdx, exIdx)}
                                    <input
                                        className="planification-input planification-comment-input"
                                        type="text"
                                        placeholder="Comentario"
                                        value={ex.comentario ?? ''}
                                        onChange={e => updateExercise(weekIdx, dayIdx, blockIdx, exIdx, 'comentario', e.target.value)}
                                    />
                                    {block.exercises.length > 1 && (
                                        <button className="planification-remove-btn" onClick={() => removeExercise(weekIdx, dayIdx, blockIdx, exIdx)} title="Quitar ejercicio">×</button>
                                    )}
                                </div>
                            ))}

                            {/* "+" adds a new row; its type is picked in the row's first column. */}
                            <button className="planification-add-exercise-btn" onClick={() => addExercise(weekIdx, dayIdx, blockIdx)}>
                                +
                            </button>
                            </>)}
                        </div>
                    ))}

                    {!isDayCollapsed && (day.comentario || commentOpen[`${weekIdx}-${dayIdx}`] ? (
                        <div className="planification-day-comment-wrap">
                            <textarea
                                className="planification-input planification-day-comment"
                                rows={2}
                                maxLength={500}
                                placeholder="Comentario del día (opcional, lo verá el atleta al entrenar)"
                                value={day.comentario ?? ''}
                                onChange={e => updateDayComment(weekIdx, dayIdx, e.target.value)}
                            />
                            <button
                                className="planification-remove-btn"
                                title="Quitar comentario"
                                onClick={() => {
                                    updateDayComment(weekIdx, dayIdx, '');
                                    setCommentOpen(prev => ({ ...prev, [`${weekIdx}-${dayIdx}`]: false }));
                                }}
                            >×</button>
                        </div>
                    ) : (
                        <button
                            className="planification-add-exercise-btn"
                            onClick={() => setCommentOpen(prev => ({ ...prev, [`${weekIdx}-${dayIdx}`]: true }))}
                        >
                            + Comentario del día
                        </button>
                    ))}
                </div>
                );
            })}
                </div>
                );
            })}

            {routinePicker && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setRoutinePicker(null)}>
                    <div className="modal">
                        <div className="modal-header"><h2>Importar rutina</h2></div>
                        <div className="modal-body">
                            {routines.map(r => (
                                <button
                                    key={r.id} type="button" className="btn btn-secondary"
                                    style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8 }}
                                    onClick={() => importRoutine(routinePicker.weekIdx, routinePicker.dayIdx, r)}
                                >
                                    {r.name} · {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}
                                </button>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setRoutinePicker(null)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {leaveAsk && (
                <div className="modal-overlay open">
                    <div className="modal">
                        <div className="modal-header"><h2>Cambios sin guardar</h2></div>
                        <div className="modal-body">
                            <p>Modificaste la planificación y todavía no la guardaste. ¿Querés guardarla antes de salir?</p>
                        </div>
                        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setLeaveAsk(false)}>Seguir editando</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setLeaveAsk(false); onBack(); }}>Salir sin guardar</button>
                            <button className="btn btn-primary btn-sm" onClick={() => { setLeaveAsk(false); handleSave(false); }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="planification-footer">
                <button className="btn btn-secondary" onClick={requestBack}>Cancelar</button>
                {isPublished ? (
                    <button className="btn btn-primary" onClick={() => handleSave(false)}>Guardar Planificación</button>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={() => handleSave(false)}>Guardar borrador</button>
                        <button className="btn btn-primary" onClick={() => handleSave(true)}>Guardar y publicar</button>
                    </>
                )}
            </div>
        </section>
    );
}
