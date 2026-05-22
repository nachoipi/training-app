import React, { useState, useEffect } from 'react';
import { uid } from '../../utils/helpers.js';
import { INTENSITY_LABELS, DAYS } from '../../utils/constants.js';

export function ModalRoutine({ open, editing, exercises, onClose, onSave }) {
    const [name, setName]     = useState('');
    const [desc, setDesc]     = useState('');
    const [days, setDays]     = useState([]);
    const [exRows, setExRows] = useState([]);

    useEffect(() => {
        if (open) {
            setName(editing ? editing.name : '');
            setDesc(editing ? editing.desc || '' : '');
            setDays(editing ? [...(editing.days || [])] : []);
            setExRows(editing ? editing.exercises.map(e => ({ ...e })) : []);
        }
    }, [open, editing]);

    function toggleDay(day) {
        setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }

    function addRow() {
        setExRows(prev => [...prev, { name: '', sets: 3, reps: '10' }]);
    }

    function updateRow(i, field, value) {
        setExRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
    }

    function removeRow(i) {
        setExRows(prev => prev.filter((_, idx) => idx !== i));
    }

    function handleSave() {
        if (!name.trim()) { alert('Ingresá un nombre para la rutina'); return; }
        const validExercises = exRows.filter(r => r.name.trim()).map(r => ({
            name: r.name.trim(),
            sets: parseInt(r.sets) || 3,
            reps: r.reps || '10',
        }));
        onSave({ id: editing ? editing.id : null, name: name.trim(), desc: desc.trim(), days, exercises: validExercises });
    }

    if (!open) return null;

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>{editing ? 'Editar Rutina' : 'Nueva Rutina'}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nombre de la rutina</label>
                        <input
                            className="form-input"
                            placeholder="ej: Push Day, Legs, Full Body..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción (opcional)</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Descripción de la rutina..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Días de la semana</label>
                        <div className="day-picker">
                            {DAYS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`day-btn ${days.includes(key) ? 'selected' : ''}`}
                                    onClick={() => toggleDay(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ejercicios</label>
                        <div className="exercises-in-routine">
                            {exRows.map((row, i) => (
                                <div key={i} className="exercise-row">
                                    <select value={row.name} onChange={e => updateRow(i, 'name', e.target.value)}>
                                        <option value="">— Ejercicio —</option>
                                        {exercises.map(e => (
                                            <option key={e.id} value={e.name}>{e.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number" placeholder="Series" min="1" max="20"
                                        value={row.sets}
                                        onChange={e => updateRow(i, 'sets', e.target.value)}
                                    />
                                    <input
                                        type="text" placeholder="Reps"
                                        value={row.reps}
                                        onChange={e => updateRow(i, 'reps', e.target.value)}
                                    />
                                    <button type="button" className="btn-remove-ex" onClick={() => removeRow(i)}>✕</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
                            + Agregar ejercicio
                        </button>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
                </div>
            </div>
        </div>
    );
}

export function ModalRoutineDetail({ open, routine, onClose, onEdit, onDelete }) {
    if (!open || !routine) return null;

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-large">
                <div className="modal-header">
                    <h2>{routine.name}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {routine.days && routine.days.length > 0 && (
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {routine.days.map(d => <span key={d} className="day-tag">{d}</span>)}
                        </div>
                    )}
                    {routine.desc && <p className="detail-desc">{routine.desc}</p>}
                    <p className="detail-exercises-title">
                        {routine.exercises.length} Ejercicio{routine.exercises.length !== 1 ? 's' : ''}
                    </p>
                    {routine.exercises.map((ex, i) => (
                        <div key={i} className="detail-exercise-item">
                            <div className="det-ex-num">{i + 1}</div>
                            <span className="det-ex-name">{ex.name}</span>
                            <span className="det-ex-sets">{ex.sets} × {ex.reps}</span>
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-danger" onClick={() => onDelete(routine.id)}>Eliminar</button>
                    <button className="btn btn-secondary" onClick={() => onEdit(routine)}>Editar</button>
                    <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}

export function ModalSession({ open, routines, onClose, onSave }) {
    const [date, setDate]           = useState('');
    const [routineId, setRoutineId] = useState('');
    const [duration, setDuration]   = useState('');
    const [notes, setNotes]         = useState('');
    const [intensity, setIntensity] = useState(3);

    useEffect(() => {
        if (open) {
            setDate(new Date().toISOString().slice(0, 10));
            setRoutineId('');
            setDuration('');
            setNotes('');
            setIntensity(3);
        }
    }, [open]);

    function handleSave() {
        if (!date) { alert('Seleccioná una fecha'); return; }
        const routine = routines.find(r => r.id === routineId);
        onSave({
            id: uid(), date,
            routineId: routineId || null,
            routineName: routine ? routine.name : 'Sesión libre',
            duration: parseInt(duration) || null,
            notes: notes.trim(),
            intensity,
        });
    }

    if (!open) return null;

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>Registrar Sesión</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Rutina realizada</label>
                        <select className="form-input" value={routineId} onChange={e => setRoutineId(e.target.value)}>
                            <option value="">— Sesión libre —</option>
                            {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fecha</label>
                        <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Duración (minutos)</label>
                        <input
                            type="number" className="form-input" placeholder="ej: 60"
                            min="1" max="300" value={duration}
                            onChange={e => setDuration(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notas (opcional)</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="¿Cómo salió el entrenamiento?"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Intensidad</label>
                        <div className="intensity-picker">
                            {[1, 2, 3, 4].map(v => (
                                <button
                                    key={v}
                                    type="button"
                                    className={`intensity-btn ${intensity === v ? 'active' : ''}`}
                                    onClick={() => setIntensity(v)}
                                >
                                    {INTENSITY_LABELS[v]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave}>Guardar Sesión</button>
                </div>
            </div>
        </div>
    );
}

export function ModalExercise({ open, onClose, onSave }) {
    const [name, setName]     = useState('');
    const [muscle, setMuscle] = useState('pecho');
    const [type, setType]     = useState('fuerza');
    const [desc, setDesc]     = useState('');

    useEffect(() => {
        if (open) { setName(''); setMuscle('pecho'); setType('fuerza'); setDesc(''); }
    }, [open]);

    function handleSave() {
        if (!name.trim()) { alert('Ingresá un nombre'); return; }
        onSave({ id: uid(), name: name.trim(), muscle, type, desc: desc.trim() });
    }

    if (!open) return null;

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>Nuevo Ejercicio</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nombre del ejercicio</label>
                        <input
                            className="form-input" placeholder="ej: Press de banca..."
                            value={name} onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Grupo muscular</label>
                        <select className="form-input" value={muscle} onChange={e => setMuscle(e.target.value)}>
                            {['pecho','espalda','piernas','hombros','brazos','core'].map(m => (
                                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tipo</label>
                        <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                            <option value="fuerza">Fuerza</option>
                            <option value="cardio">Cardio</option>
                            <option value="movilidad">Movilidad</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción (opcional)</label>
                        <textarea
                            className="form-input form-textarea" placeholder="Técnica, consejos..."
                            value={desc} onChange={e => setDesc(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
                </div>
            </div>
        </div>
    );
}
