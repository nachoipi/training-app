// Builds and stores the in-app notifications for the three bell events
// (session completed, session reviewed, plan assigned/updated). Called by the
// sessionLog and planification controllers AFTER their main write. Every
// function swallows its own errors: a notification problem must never make an
// athlete's session save or a trainer's plan save fail.
import { NotificationModel } from '../models/notification.model.js';

async function safeUpsert(payload) {
    try { await NotificationModel.upsert(payload); }
    catch (err) { console.error('[notify] failed:', err.message); }
}

// Recipient: the trainer who created the plan (not every trainer), so a test
// athlete never pings a real trainer.
export const notifySessionCompleted = ({ trainerId, athleteName, planName, planId, week, dayNumber }) =>
    safeUpsert({
        userId: trainerId,
        type: 'session_completed',
        title: `${athleteName} completó una sesión`,
        body: `${planName} · Semana ${week}, Día ${dayNumber}`,
        data: { planId, week, dayNumber },
        dedupeKey: `session:${planId}:${week}:${dayNumber}`,
    });

export const notifySessionReviewed = ({ athleteId, planName, planId, week, dayNumber, comment }) =>
    safeUpsert({
        userId: athleteId,
        type: 'session_reviewed',
        title: 'Tu entrenador revisó tu sesión',
        body: comment ? `"${comment.slice(0, 140)}"` : `${planName} · Semana ${week}, Día ${dayNumber}`,
        data: { planId, week, dayNumber },
        dedupeKey: `review:${planId}:${week}:${dayNumber}`,
    });

// One unread entry per plan: further edits refresh it (see NotificationModel.upsert).
export const notifyPlanChange = ({ athleteId, planId, planName, created }) =>
    safeUpsert({
        userId: athleteId,
        type: created ? 'plan_assigned' : 'plan_updated',
        title: created ? 'Tu entrenador te asignó un plan' : 'Tu entrenador actualizó tu plan',
        body: planName,
        data: { planId },
        dedupeKey: `plan:${planId}`,
    });
