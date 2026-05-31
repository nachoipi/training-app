import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header/index.jsx';
import { Main } from '../components/Main/index.jsx';
import { Toast } from '../components/Common/index.jsx';
import {
    ModalRoutine,
    ModalRoutineDetail,
    ModalSession,
    ModalExercise,
} from '../components/Modals/index.jsx';
import { getCurrentUser } from '../utils/helpers.js';
import { planificationService } from '../services/planificationService.js';
import { sessionLogService } from '../services/sessionLogService.js';
import { routineService } from '../services/routineService.js';
import { sessionService } from '../services/sessionService.js';
import { exerciseService } from '../services/exerciseService.js';
import { logout as doLogout } from '../services/authService.js';

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser]               = useState(null);
    const [routines, setRoutines]       = useState([]);
    const [sessions, setSessions]       = useState([]);
    const [exercises, setExercises]     = useState([]);
    const [activeSection, setSection]   = useState('routines');
    const [collapsed, setCollapsed]     = useState(false);
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [progressPeriod, setProgressPeriod] = useState(30);
    const [toast, setToast]             = useState({ msg: '', type: 'success', show: false });
    const [theme, setTheme]             = useState(() => localStorage.getItem('fitcore_theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fitcore_theme', theme);
    }, [theme]);

    const [selectedAthlete, setSelectedAthlete]         = useState(null);
    const [planifications, setPlanifications]           = useState([]);
    const [selectedPlanification, setSelectedPlanification] = useState(null);
    const [sessionLogs, setSessionLogs]                 = useState([]);
    const [selectedSession, setSelectedSession]         = useState(null);

    const [routineModal, setRoutineModal]           = useState({ open: false, editing: null });
    const [sessionModal, setSessionModal]           = useState(false);
    const [routineDetailModal, setRoutineDetailModal] = useState({ open: false, routine: null });
    const [exerciseModal, setExerciseModal]         = useState(false);

    function showToast(msg, type = 'success') {
        setToast({ msg, type, show: true });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
    }

    useEffect(() => {
        const userData = getCurrentUser();
        setUser(userData);
        if (userData && userData.role === 'athlete') setSection('my-plan');

        // Load all domain data from the API. The DB is the only source of truth
        // now — no localStorage fallback. Each call is independent so we let
        // them race; per-section errors don't block the others.
        routineService.list()
            .then(r => setRoutines(r.data))
            .catch(err => showToast(err.message, 'error'));

        sessionService.list()
            .then(r => setSessions(r.data))
            .catch(err => showToast(err.message, 'error'));

        exerciseService.list()
            .then(r => setExercises(r.data))
            .catch(err => showToast(err.message, 'error'));

        planificationService.list()
            .then(r => setPlanifications(r.data))
            .catch(err => showToast(err.message, 'error'));

        sessionLogService.list()
            .then(r => setSessionLogs(r.data))
            .catch(() => setSessionLogs([]));
    }, []);

    async function handleLogout() {
        if (confirm('¿Cerrar sesión?')) {
            await doLogout();
            navigate('/login');
        }
    }

    async function handleSaveSessionLog(log) {
        try {
            const saved = await sessionLogService.save(log);
            setSessionLogs(prev => {
                const exists = prev.findIndex(l => l.planId === saved.planId && l.week === saved.week && l.dayNumber === saved.dayNumber);
                return exists >= 0 ? prev.map((l, i) => i === exists ? saved : l) : [...prev, saved];
            });
        } catch (err) { showToast(err.message, 'error'); return; }
        setSelectedSession(null);
        setSection('my-sessions');
    }

    async function handleSaveRoutine(routine) {
        try {
            if (routine.id) {
                const updated = await routineService.update(routine.id, routine);
                setRoutines(rs => rs.map(r => r.id === updated.id ? updated : r));
                showToast('Rutina actualizada ✓');
            } else {
                const created = await routineService.create(routine);
                setRoutines(rs => [...rs, created]);
                showToast('Rutina creada ✓');
            }
            setRoutineModal({ open: false, editing: null });
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function handleDeleteRoutine(id) {
        if (!confirm('¿Eliminar esta rutina?')) return;
        try {
            await routineService.remove(id);
            setRoutines(rs => rs.filter(r => r.id !== id));
            setRoutineDetailModal({ open: false, routine: null });
            showToast('Rutina eliminada');
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function handleSaveSession(session) {
        try {
            const created = await sessionService.create(session);
            setSessions(ss => [...ss, created]);
            setSessionModal(false);
            showToast('Sesión registrada ✓');
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function handleDeleteSession(id) {
        try {
            await sessionService.remove(id);
            setSessions(ss => ss.filter(s => s.id !== id));
            showToast('Sesión eliminada');
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function handleSaveExercise(exercise) {
        try {
            const created = await exerciseService.create(exercise);
            setExercises(es => [...es, created]);
            setExerciseModal(false);
            showToast('Ejercicio agregado ✓');
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function handleDeleteExercise(id) {
        try {
            await exerciseService.remove(id);
            setExercises(es => es.filter(e => e.id !== id));
            showToast('Ejercicio eliminado');
        } catch (err) { showToast(err.message, 'error'); }
    }

    return (
        <>
            <Header
                user={user}
                activeSection={activeSection}
                onNavigate={setSection}
                onLogout={handleLogout}
                collapsed={collapsed}
                onToggle={() => setCollapsed(c => !c)}
                theme={theme}
                onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            />

            <Main
                activeSection={activeSection}
                routines={routines}
                sessions={sessions}
                exercises={exercises}
                user={user}
                muscleFilter={muscleFilter}
                progressPeriod={progressPeriod}
                selectedAthlete={selectedAthlete}
                onNewRoutine={() => setRoutineModal({ open: true, editing: null })}
                onOpenDetail={routine => setRoutineDetailModal({ open: true, routine })}
                onLogSession={() => setSessionModal(true)}
                onDeleteSession={handleDeleteSession}
                onChangePeriod={setProgressPeriod}
                onFilterChange={setMuscleFilter}
                onNewExercise={() => setExerciseModal(true)}
                onDeleteExercise={handleDeleteExercise}
                onShowToast={showToast}
                planifications={planifications}
                selectedPlanification={selectedPlanification}
                onOpenAthleteProfile={athlete => { setSelectedAthlete(athlete); setSection('athlete-profile'); }}
                onOpenPlanification={() => { setSelectedPlanification(null); setSection('athlete-planification'); }}
                onViewPlanification={plan => { setSelectedPlanification(plan); setSection('athlete-planification'); }}
                onDeletePlanification={async id => {
                    if (!confirm('¿Eliminar esta planificación?')) return;
                    try {
                        await planificationService.remove(id);
                        setPlanifications(ps => ps.filter(p => p.id !== id));
                        showToast('Planificación eliminada');
                    } catch (err) { showToast(err.message, 'error'); }
                }}
                onSavePlanification={async plan => {
                    try {
                        if (plan.id) {
                            const updated = await planificationService.update(plan.id, plan);
                            setPlanifications(ps => ps.map(p => p.id === updated.id ? updated : p));
                            showToast('Planificación actualizada ✓');
                        } else {
                            const created = await planificationService.create(plan);
                            setPlanifications(ps => [...ps, created]);
                            showToast('Planificación guardada ✓');
                        }
                        setSelectedPlanification(null);
                        setSection('athlete-profile');
                    } catch (err) { showToast(err.message, 'error'); }
                }}
                onNavigate={setSection}
                selectedSession={selectedSession}
                sessionLogs={sessionLogs}
                onOpenSession={({ plan, week, day }) => { setSelectedSession({ plan, week, day }); setSection('my-session'); }}
                onSaveSessionLog={handleSaveSessionLog}
            />

            <ModalRoutine
                open={routineModal.open}
                editing={routineModal.editing}
                exercises={exercises}
                onClose={() => setRoutineModal({ open: false, editing: null })}
                onSave={handleSaveRoutine}
            />
            <ModalRoutineDetail
                open={routineDetailModal.open}
                routine={routineDetailModal.routine}
                onClose={() => setRoutineDetailModal({ open: false, routine: null })}
                onEdit={routine => {
                    setRoutineDetailModal({ open: false, routine: null });
                    setRoutineModal({ open: true, editing: routine });
                }}
                onDelete={handleDeleteRoutine}
            />
            <ModalSession
                open={sessionModal}
                routines={routines}
                onClose={() => setSessionModal(false)}
                onSave={handleSaveSession}
            />
            <ModalExercise
                open={exerciseModal}
                onClose={() => setExerciseModal(false)}
                onSave={handleSaveExercise}
            />

            <Toast message={toast.msg} type={toast.type} show={toast.show} />
        </>
    );
}
