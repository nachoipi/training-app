// App shell for authenticated users. Loads every domain collection from the API,
// owns the `activeSection` navigation state and the CRUD handlers, and passes
// both down to Main (screens), Header/BottomNav/TopBar (navigation) and modals.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header/index.jsx';
import { Main } from '../components/Main/index.jsx';
import { BottomNav } from '../components/BottomNav/index.jsx';
import { TopBar } from '../components/TopBar/index.jsx';
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

// Sections that can be restored on refresh, per role. Detail screens (athlete profile, plan
// editor, session) also need their selection restored; see loadNav / the restore effect below.
const NAV_SECTIONS = {
    athlete: ['my-dashboard', 'my-plan', 'my-sessions', 'my-session', 'routines', 'sessions', 'progress', 'exercises', 'profile'],
    trainer: ['athletes', 'athlete-profile', 'athlete-planification', 'routines', 'sessions', 'progress', 'exercises', 'profile'],
};

// Reads the last screen the user was on (saved per user id) so a page refresh lands there
// instead of on the default section. Falls back to the role default when nothing valid is saved.
function loadNav() {
    const u = getCurrentUser();
    const role = u?.role === 'athlete' ? 'athlete' : 'trainer';
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(`fitcore_nav_${u?.id}`)); } catch { /* ignore corrupt value */ }
    let section = saved && NAV_SECTIONS[role].includes(saved.section)
        ? saved.section
        : (role === 'athlete' ? 'my-dashboard' : 'routines');
    // Detail screens are useless without the data they were opened with.
    if ((section === 'athlete-profile' || section === 'athlete-planification') && !saved?.athlete) section = 'athletes';
    if (section === 'my-session' && !saved?.session) section = 'my-plan';
    return { section, athlete: saved?.athlete ?? null, planId: saved?.planId ?? null, session: saved?.session ?? null };
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [nav0] = useState(loadNav);
    const [user, setUser]               = useState(null);
    const [routines, setRoutines]       = useState([]);
    const [sessions, setSessions]       = useState([]);
    const [exercises, setExercises]     = useState([]);
    const [activeSection, setSection]   = useState(nav0.section);
    const [collapsed, setCollapsed]     = useState(false);
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [progressPeriod, setProgressPeriod] = useState(30);
    const [toast, setToast]             = useState({ msg: '', type: 'success', show: false });
    const [theme, setTheme]             = useState(() => localStorage.getItem('fitcore_theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fitcore_theme', theme);
    }, [theme]);

    const [selectedAthlete, setSelectedAthlete]         = useState(nav0.athlete);
    const [planifications, setPlanifications]           = useState([]);
    const [plansLoaded, setPlansLoaded]                 = useState(false);
    const [selectedPlanification, setSelectedPlanification] = useState(null);
    const [sessionLogs, setSessionLogs]                 = useState([]);
    const [selectedSession, setSelectedSession]         = useState(null);

    const [routineModal, setRoutineModal]           = useState({ open: false, editing: null });
    const [sessionModal, setSessionModal]           = useState(false);
    const [routineDetailModal, setRoutineDetailModal] = useState({ open: false, routine: null });
    const [exerciseModal, setExerciseModal]         = useState(false);
    const [editingExercise, setEditingExercise]     = useState(null);

    function showToast(msg, type = 'success') {
        setToast({ msg, type, show: true });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
    }

    useEffect(() => {
        const userData = getCurrentUser();
        setUser(userData);

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
            .then(r => { setPlanifications(r.data); setPlansLoaded(true); })
            .catch(err => { setPlansLoaded(true); showToast(err.message, 'error'); });

        sessionLogService.list()
            .then(r => setSessionLogs(r.data))
            .catch(() => setSessionLogs([]));
    }, []);

    // Selections that reference a planification (plan editor, open session) can only be
    // resolved once the plans are loaded; until then `restoring` blocks persistence so the
    // saved values are not overwritten with nulls.
    const restoring = useRef(!!(nav0.planId || nav0.session));
    useEffect(() => {
        if (!restoring.current || !plansLoaded) return;
        if (nav0.planId) setSelectedPlanification(planifications.find(p => p.id === nav0.planId) ?? null);
        if (nav0.session) {
            const plan = planifications.find(p => p.id === nav0.session.planId);
            const days = plan ? (plan.weekDays?.[nav0.session.week - 1] ?? plan.days ?? []) : [];
            const day = days.find(d => d.dayNumber === nav0.session.dayNumber);
            if (plan && day) setSelectedSession({ plan, week: nav0.session.week, day, from: nav0.session.from });
            else setSection('my-plan');
        }
        restoring.current = false;
    }, [plansLoaded]);

    // Remember where the user is so a refresh brings them back to the same screen.
    useEffect(() => {
        if (!user || restoring.current) return;
        try {
            localStorage.setItem(`fitcore_nav_${user.id}`, JSON.stringify({
                section: activeSection,
                athlete: selectedAthlete,
                planId: selectedPlanification?.id ?? null,
                session: selectedSession
                    ? { planId: selectedSession.plan.id, week: selectedSession.week, dayNumber: selectedSession.day.dayNumber, from: selectedSession.from }
                    : null,
            }));
        } catch { /* storage full/blocked: refresh just lands on the default screen */ }
    }, [user, activeSection, selectedAthlete, selectedPlanification, selectedSession]);

    // Receive the updated user blob from the Profile screen so the sidebar
    // and BottomNav re-render with the new name/avatar without a reload.
    function handleProfileUpdated(updated) {
        setUser(updated);
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

    // Duplicates a planification (optionally for another athlete) by POSTing a deep copy of
    // its weeks/days. Session logs are not copied: the new plan starts with no progress.
    async function handleCopyPlanification({ plan, athleteId, name }) {
        const weekDays = structuredClone(plan.weekDays ?? Array.from({ length: plan.weeks }, () => plan.days ?? []));
        const created = await planificationService.create({ athleteId, name, weeks: plan.weeks, weekDays });
        setPlanifications(ps => [...ps, created]);
        showToast('Planificación copiada');
    }

    async function handleSaveRoutine(routine) {
        try {
            if (routine.id) {
                const updated = await routineService.update(routine.id, routine);
                setRoutines(rs => rs.map(r => r.id === updated.id ? updated : r));
                showToast('Rutina actualizada');
            } else {
                const created = await routineService.create(routine);
                setRoutines(rs => [...rs, created]);
                showToast('Rutina creada');
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
            showToast('Sesión registrada');
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function handleDeleteSession(id) {
        try {
            await sessionService.remove(id);
            setSessions(ss => ss.filter(s => s.id !== id));
            showToast('Sesión eliminada');
        } catch (err) { showToast(err.message, 'error'); }
    }

    // Single handler for both create and update — branches on whether we're
    // editing an existing row. The id baked into `exercise` is the source of
    // truth (ModalExercise reuses editing.id when editing).
    async function handleSaveExercise(exercise) {
        try {
            if (editingExercise) {
                const updated = await exerciseService.update(editingExercise.id, exercise);
                setExercises(es => es.map(e => e.id === updated.id ? updated : e));
                showToast('Ejercicio actualizado');
            } else {
                const created = await exerciseService.create(exercise);
                setExercises(es => [...es, created]);
                showToast('Ejercicio agregado');
            }
            setExerciseModal(false);
            setEditingExercise(null);
        } catch (err) { showToast(err.message, 'error'); }
    }

    function handleEditExercise(exercise) {
        setEditingExercise(exercise);
        setExerciseModal(true);
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
                collapsed={collapsed}
                onToggle={() => setCollapsed(c => !c)}
            />

            <Main
                className={user?.role === 'athlete' ? 'main--athlete' : ''}
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
                onNewExercise={() => { setEditingExercise(null); setExerciseModal(true); }}
                onEditExercise={handleEditExercise}
                onDeleteExercise={handleDeleteExercise}
                onShowToast={showToast}
                planifications={planifications}
                selectedPlanification={selectedPlanification}
                onOpenAthleteProfile={athlete => { setSelectedAthlete(athlete); setSection('athlete-profile'); }}
                onOpenPlanification={() => { setSelectedPlanification(null); setSection('athlete-planification'); }}
                onViewPlanification={plan => { setSelectedPlanification(plan); setSection('athlete-planification'); }}
                onCopyPlanification={handleCopyPlanification}
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
                            showToast('Planificación actualizada');
                        } else {
                            const created = await planificationService.create(plan);
                            setPlanifications(ps => [...ps, created]);
                            showToast('Planificación guardada');
                        }
                        setSelectedPlanification(null);
                        setSection('athlete-profile');
                    } catch (err) { showToast(err.message, 'error'); }
                }}
                onNavigate={setSection}
                selectedSession={selectedSession}
                sessionLogs={sessionLogs}
                // `from` remembers the screen the session was opened from so Back can return there.
                onOpenSession={({ plan, week, day }) => { setSelectedSession({ plan, week, day, from: activeSection }); setSection('my-session'); }}
                onSaveSessionLog={handleSaveSessionLog}
                onProfileUpdated={handleProfileUpdated}
                theme={theme}
                onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                onLogout={handleLogout}
            />

            <BottomNav
                user={user}
                activeSection={activeSection}
                onNavigate={setSection}
            />

            <TopBar
                user={user}
                activeSection={activeSection}
                onNavigate={setSection}
                sidebarCollapsed={collapsed}
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
                editing={editingExercise}
                onClose={() => { setExerciseModal(false); setEditingExercise(null); }}
                onSave={handleSaveExercise}
            />

            <Toast message={toast.msg} type={toast.type} show={toast.show} />
        </>
    );
}
