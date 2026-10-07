// Section router for the main content area. Dashboard.jsx owns all state and
// the `activeSection` string; this component only picks which screen to render
// and forwards the relevant props/handlers.
import React from 'react';
import {
    RoutinesSection,
    SessionsSection,
    ProgressSection,
    ExercisesSection,
} from './Sections.jsx';
import { AthletesSection } from './AthletesSection.jsx';
import { AthleteProfile } from './AthleteProfile.jsx';
import { AthletePlanification } from './AthletePlanification.jsx';
import { AthleteDashboard } from './AthleteDashboard.jsx';
import { AthleteMyPlan } from './AthleteMyPlan.jsx';
import { AthleteMySessions } from './AthleteMySessions.jsx';
import { AthleteMySession } from './AthleteMySession.jsx';
import { Profile } from './Profile.jsx';

export function Main({
    activeSection,
    routines,
    sessions,
    exercises,
    user,
    muscleFilter,
    progressPeriod,
    selectedAthlete,
    selectedPlanification,
    onNewRoutine,
    onOpenDetail,
    onLogSession,
    onDeleteSession,
    onChangePeriod,
    onFilterChange,
    onNewExercise,
    onEditExercise,
    onDeleteExercise,
    onShowToast,
    onOpenAthleteProfile,
    onOpenPlanification,
    onViewPlanification,
    onCopyPlanification,
    onDeletePlanification,
    onSavePlanification,
    planifications,
    onNavigate,
    selectedSession,
    sessionLogs,
    onOpenSession,
    onSaveSessionLog,
    onProfileUpdated,
    theme,
    onToggleTheme,
    onLogout,
    className,
}) {
    return (
        <main className={`main-content ${className || ''}`}>
            {activeSection === 'routines' && (
                <RoutinesSection
                    routines={routines}
                    sessions={sessions}
                    user={user}
                    onNewRoutine={onNewRoutine}
                    onOpenDetail={onOpenDetail}
                />
            )}
            {activeSection === 'sessions' && (
                <SessionsSection
                    sessions={sessions}
                    onLogSession={onLogSession}
                    onDeleteSession={onDeleteSession}
                />
            )}
            {activeSection === 'progress' && (
                <ProgressSection
                    sessions={sessions}
                    progressPeriod={progressPeriod}
                    onChangePeriod={onChangePeriod}
                />
            )}
            {activeSection === 'exercises' && (
                <ExercisesSection
                    exercises={exercises}
                    user={user}
                    muscleFilter={muscleFilter}
                    onFilterChange={onFilterChange}
                    onNewExercise={onNewExercise}
                    onEditExercise={onEditExercise}
                    onDeleteExercise={onDeleteExercise}
                />
            )}
            {activeSection === 'my-dashboard' && (
                <AthleteDashboard
                    user={user}
                    planifications={planifications}
                    sessionLogs={sessionLogs}
                    onOpenSession={onOpenSession}
                    onNavigate={onNavigate}
                />
            )}
            {activeSection === 'my-plan' && (
                <AthleteMyPlan planifications={planifications} sessionLogs={sessionLogs} onOpenSession={onOpenSession} />
            )}
            {activeSection === 'my-sessions' && (
                <AthleteMySessions planifications={planifications} sessionLogs={sessionLogs} onOpenSession={onOpenSession} />
            )}
            {activeSection === 'my-session' && selectedSession && (
                <AthleteMySession
                    plan={selectedSession.plan}
                    week={selectedSession.week}
                    day={selectedSession.day}
                    sessionLog={sessionLogs.find(l =>
                        l.planId === selectedSession.plan.id &&
                        l.week === selectedSession.week &&
                        l.dayNumber === selectedSession.day.dayNumber
                    ) || null}
                    onBack={() => onNavigate(selectedSession.from === 'my-plan' ? 'my-plan' : 'my-sessions')}
                    onSave={onSaveSessionLog}
                    onShowToast={onShowToast}
                />
            )}
            {activeSection === 'profile' && (
                <Profile
                    user={user}
                    onShowToast={onShowToast}
                    onProfileUpdated={onProfileUpdated}
                    theme={theme}
                    onToggleTheme={onToggleTheme}
                    onLogout={onLogout}
                />
            )}
            {activeSection === 'athletes' && (
                <AthletesSection onShowToast={onShowToast} onOpenAthleteProfile={onOpenAthleteProfile} />
            )}
            {activeSection === 'athlete-profile' && selectedAthlete && (
                <AthleteProfile
                    athlete={selectedAthlete}
                    planifications={planifications.filter(p => p.athleteId === selectedAthlete.id)}
                    sessionLogs={sessionLogs}
                    onBack={() => onNavigate('athletes')}
                    onOpenPlanification={onOpenPlanification}
                    onViewPlanification={onViewPlanification}
                    onCopyPlanification={onCopyPlanification}
                    onDeletePlanification={onDeletePlanification}
                    onShowToast={onShowToast}
                />
            )}
            {activeSection === 'athlete-planification' && selectedAthlete && (
                <AthletePlanification
                    athlete={selectedAthlete}
                    exercises={exercises}
                    planification={selectedPlanification}
                    onBack={() => onNavigate('athlete-profile')}
                    onSave={onSavePlanification}
                    onShowToast={onShowToast}
                />
            )}
        </main>
    );
}
