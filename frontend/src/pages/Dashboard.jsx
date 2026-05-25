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
import { getCurrentUser, loadUserData, saveUserData, uid } from '../utils/helpers.js';
import { planificationService } from '../services/planificationService.js';
import { sessionLogService } from '../services/sessionLogService.js';
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

    useEffect(() => {
        const userData = getCurrentUser();
        setUser(userData);
        const data = loadUserData(userData);
        setRoutines(data.routines);
        setSessions(data.sessions);
        setExercises(data.exercises);
        if (userData && userData.role === 'athlete') setSection('my-plan');

        planificationService.list()
            .then(r => setPlanifications(r.data))
            .catch(err => showToast(err.message, 'error'));

        sessionLogService.list()
            .then(r => setSessionLogs(r.data))
            .catch(() => setSessionLogs([]));
    }, []);

    useEffect(() => {
        if (user) saveUserData(user, routines, sessions, exercises);
    }, [routines, sessions, exercises, user]);

    function showToast(msg, type = 'success') {
        setToast({ msg, type, show: true });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
    }

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

    function handleSaveRoutine(routine) {
        if (routine.id) {
            setRoutines(rs => rs.map(r => r.id === routine.id ? { ...r, ...routine } : r));
            showToast('Rutina actualizada ✓');
        } else {
            setRoutines(rs => [...rs, { ...routine, id: uid(), createdAt: new Date().toISOString() }]);
            showToast('Rutina creada ✓');
        }
        setRoutineModal({ open: false, editing: null });
    }

    function handleDeleteRoutine(id) {
        if (!confirm('¿Eliminar esta rutina?')) return;
        setRoutines(rs => rs.filter(r => r.id !== id));
        setRoutineDetailModal({ open: false, routine: null });
        showToast('Rutina eliminada');
    }

    function handleSaveSession(session) {
        setSessions(ss => [...ss, session]);
        setSessionModal(false);
        showToast('Sesión registrada ✓');
    }

    function handleDeleteSession(id) {
        setSessions(ss => ss.filter(s => s.id !== id));
        showToast('Sesión eliminada');
    }

    function handleSaveExercise(exercise) {
        setExercises(es => [...es, exercise]);
        setExerciseModal(false);
        showToast('Ejercicio agregado ✓');
    }

    function handleDeleteExercise(id) {
        setExercises(es => es.filter(e => e.id !== id));
        showToast('Ejercicio eliminado');
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
