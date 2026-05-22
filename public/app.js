/* ============================================================
   FitCore Pro — Frontend App
   ============================================================ */

// ============================================================
// AUTH
// ============================================================

function getToken() {
    return localStorage.getItem('fitcore_token');
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('fitcore_user');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function logout() {
    localStorage.removeItem('fitcore_token');
    localStorage.removeItem('fitcore_user');
    window.location.href = '/login.html';
}

// Role helpers
function isTrainer() {
    const u = getCurrentUser();
    return u && u.role === 'trainer';
}

function initRoleBasedUI() {
    const user = getCurrentUser();
    if (!user) return;

    // Update sidebar user info
    const avatar = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRoleBadge');

    if (avatar) avatar.textContent = user.avatar || user.name[0].toUpperCase();
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role === 'trainer' ? '⚡ Entrenador' : '💪 Atleta';

    // Show/hide trainer-only elements (class-based)
    document.querySelectorAll('.trainer-only').forEach(el => {
        el.style.display = isTrainer() ? '' : 'none';
    });

    // Ocultar botón "Nueva Rutina" para atletas (solo trainers crean rutinas)
    const btnNew = document.getElementById('btnNewRoutine');
    if (btnNew) btnNew.style.display = isTrainer() ? '' : 'none';
}

// ============================================================
// STATE
// ============================================================
let state = {
    routines: [],
    sessions: [],
    exercises: [],
    activeSection: 'routines',
    selectedIntensity: 3,
    selectedDays: [],
    muscleFilter: 'all',
    progressPeriod: 30,
};

const DEFAULT_EXERCISES = [
    { id: 'e1',  name: 'Press de Banca',          muscle: 'pecho',   type: 'fuerza',    desc: 'Ejercicio compuesto para el pecho con barra o mancuernas.' },
    { id: 'e2',  name: 'Press Inclinado',          muscle: 'pecho',   type: 'fuerza',    desc: 'Variante que enfatiza la parte superior del pecho.' },
    { id: 'e3',  name: 'Aperturas con Mancuerna',  muscle: 'pecho',   type: 'fuerza',    desc: 'Aislamiento del pectoral con rango completo de movimiento.' },
    { id: 'e4',  name: 'Dominadas',                muscle: 'espalda', type: 'fuerza',    desc: 'Ejercicio de tracción con peso corporal.' },
    { id: 'e5',  name: 'Remo con Barra',           muscle: 'espalda', type: 'fuerza',    desc: 'Movimiento de jalón horizontal para espalda media.' },
    { id: 'e6',  name: 'Jalón al Pecho',           muscle: 'espalda', type: 'fuerza',    desc: 'Ejercicio de polea para el dorsal ancho.' },
    { id: 'e7',  name: 'Sentadilla',               muscle: 'piernas', type: 'fuerza',    desc: 'El rey de los ejercicios de piernas.' },
    { id: 'e8',  name: 'Prensa de Piernas',        muscle: 'piernas', type: 'fuerza',    desc: 'Alternativa a la sentadilla con mayor control.' },
    { id: 'e9',  name: 'Peso Muerto Rumano',       muscle: 'piernas', type: 'fuerza',    desc: 'Isquiotibiales y glúteos.' },
    { id: 'e10', name: 'Press Militar',            muscle: 'hombros', type: 'fuerza',    desc: 'Press vertical para el deltoides frontal.' },
    { id: 'e11', name: 'Elevaciones Laterales',    muscle: 'hombros', type: 'fuerza',    desc: 'Aislamiento del deltoides medial.' },
    { id: 'e12', name: 'Curl de Bíceps',           muscle: 'brazos',  type: 'fuerza',    desc: 'Ejercicio básico de aislamiento para el bíceps.' },
    { id: 'e13', name: 'Extensión de Tríceps',     muscle: 'brazos',  type: 'fuerza',    desc: 'Aislamiento del tríceps.' },
    { id: 'e14', name: 'Plancha',                  muscle: 'core',    type: 'fuerza',    desc: 'Ejercicio isométrico para el core completo.' },
    { id: 'e15', name: 'Abdominales',              muscle: 'core',    type: 'fuerza',    desc: 'Curl abdominal clásico.' },
    { id: 'e16', name: 'Correr',                   muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo a alto impacto.' },
    { id: 'e17', name: 'Bicicleta',                muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo impacto.' },
    { id: 'e18', name: 'Estiramiento de Cadera',   muscle: 'piernas', type: 'movilidad', desc: 'Mejora la movilidad de cadera.' },
];

// Mock athletes data (trainer view)
const MOCK_ATHLETES = [
    { id: 'nacho1',  name: 'Nacho',     email: 'nacho@fitcore.com',  sessions: 24, routines: 3, lastSession: '2026-05-14', avatar: 'N' },
    // { id: 'carlos1', name: 'Carlos M.', email: 'carlos@example.com', sessions: 18, routines: 2, lastSession: '2026-05-15', avatar: 'C' },
    // { id: 'laura1',  name: 'Laura P.',  email: 'laura@example.com',  sessions: 31, routines: 4, lastSession: '2026-05-12', avatar: 'L' },
    // { id: 'diego1',  name: 'Diego R.',  email: 'diego@example.com',  sessions: 8,  routines: 1, lastSession: '2026-05-10', avatar: 'D' },
    // { id: 'ana1',    name: 'Ana S.',    email: 'ana@example.com',    sessions: 45, routines: 5, lastSession: '2026-05-16', avatar: 'A' },
];

// ============================================================
// PERSISTENCE (localStorage)
// ============================================================
function stateKey(key) {
    const user = getCurrentUser();
    // Each user gets their own data namespace
    const userId = user ? user.id : 'guest';
    return `fitcore_${userId}_${key}`;
}

function loadState() {
    try {
        const routines  = localStorage.getItem(stateKey('routines'));
        const sessions  = localStorage.getItem(stateKey('sessions'));
        const exercises = localStorage.getItem(stateKey('exercises'));
        state.routines  = routines  ? JSON.parse(routines)  : [];
        state.sessions  = sessions  ? JSON.parse(sessions)  : [];
        state.exercises = exercises ? JSON.parse(exercises) : DEFAULT_EXERCISES.slice();
    } catch {
        state.exercises = DEFAULT_EXERCISES.slice();
    }
}

function saveState() {
    try {
        localStorage.setItem(stateKey('routines'),  JSON.stringify(state.routines));
        localStorage.setItem(stateKey('sessions'),  JSON.stringify(state.sessions));
        localStorage.setItem(stateKey('exercises'), JSON.stringify(state.exercises));
    } catch {}
}

// ============================================================
// NAVIGATION
// ============================================================
function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(item.dataset.section);
        });
    });
}

function navigateTo(section) {
    state.activeSection = section;

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');

    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.remove('hidden');

    if (section === 'routines')  renderRoutines();
    if (section === 'sessions')  renderSessions();
    if (section === 'progress')  renderProgress();
    if (section === 'exercises') renderExercises();
    if (section === 'athletes')  renderAthletes();
}

// ============================================================
// SIDEBAR
// ============================================================
function initSidebar() {
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) logout();
    });
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================================
// MODALS
// ============================================================
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

// ============================================================
// UTILS
// ============================================================
function uid() { return '_' + Math.random().toString(36).slice(2, 10); }

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDayMonth(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return {
        day:   d.getDate(),
        month: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
    };
}

// ============================================================
// ROUTINES
// ============================================================
function renderRoutines() {
    const grid  = document.getElementById('routinesGrid');
    const empty = document.getElementById('routinesEmpty');

    if (!state.routines.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        // Mensaje diferente según rol
        if (empty) {
            if (isTrainer()) {
                empty.innerHTML = `
                    <span class="empty-icon">📋</span>
                    <h3>Sin rutinas todavía</h3>
                    <p>Creá la primera rutina para tus alumnos</p>
                    <button class="btn btn-primary" onclick="openNewRoutineModal()">+ Nueva Rutina</button>`;
            } else {
                empty.innerHTML = `
                    <span class="empty-icon">📋</span>
                    <h3>Aún no tenés rutinas asignadas</h3>
                    <p>Tu entrenador te asignará un plan pronto</p>`;
            }
        }
    } else {
        empty.style.display = 'none';
        grid.innerHTML = state.routines.map(r => `
            <div class="routine-card" onclick="openRoutineDetail('${r.id}')">
                <div class="routine-card-header">
                    <span class="routine-name">${r.name}</span>
                </div>
                <div class="routine-days">
                    ${(r.days || []).map(d => `<span class="day-tag">${d}</span>`).join('')}
                </div>
                <div class="routine-exercise-count">
                    ${r.exercises.length} ejercicio${r.exercises.length !== 1 ? 's' : ''}
                </div>
                ${r.desc ? `<p class="routine-desc">${r.desc}</p>` : ''}
            </div>
        `).join('');
    }

    document.getElementById('statTotalRoutines').textContent = state.routines.length;
    const totalEx = state.routines.reduce((s, r) => s + r.exercises.length, 0);
    document.getElementById('statTotalExercisesInRoutines').textContent = totalEx;
    const lastSession = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
    document.getElementById('statLastRoutineDay').textContent = lastSession ? formatDate(lastSession.date) : '—';
}

function openNewRoutineModal(routineId = null) {
    state.selectedDays = [];
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('routineId').value = '';
    document.getElementById('routineName').value = '';
    document.getElementById('routineDesc').value = '';
    document.getElementById('exercisesInRoutine').innerHTML = '';
    document.getElementById('modalRoutineTitle').textContent = routineId ? 'Editar Rutina' : 'Nueva Rutina';

    if (routineId) {
        const r = state.routines.find(r => r.id === routineId);
        if (r) {
            document.getElementById('routineId').value = r.id;
            document.getElementById('routineName').value = r.name;
            document.getElementById('routineDesc').value = r.desc || '';
            state.selectedDays = r.days ? [...r.days] : [];
            state.selectedDays.forEach(day => {
                const btn = document.querySelector(`.day-btn[data-day="${day}"]`);
                if (btn) btn.classList.add('selected');
            });
            r.exercises.forEach(ex => addExerciseRow(ex));
        }
    }

    openModal('modalRoutine');
}

function saveRoutine() {
    const name = document.getElementById('routineName').value.trim();
    if (!name) { showToast('Ingresá un nombre para la rutina', 'error'); return; }

    const rows = document.querySelectorAll('#exercisesInRoutine .exercise-row');
    const exercises = [];
    rows.forEach(row => {
        const nameEl = row.querySelector('.ex-name');
        const setsEl = row.querySelector('.ex-sets');
        const repsEl = row.querySelector('.ex-reps');
        if (nameEl && nameEl.value.trim()) {
            exercises.push({
                name: nameEl.value.trim(),
                sets: parseInt(setsEl?.value) || 3,
                reps: repsEl?.value.trim() || '10',
            });
        }
    });

    const existingId = document.getElementById('routineId').value;

    if (existingId) {
        const idx = state.routines.findIndex(r => r.id === existingId);
        if (idx > -1) {
            state.routines[idx] = {
                ...state.routines[idx],
                name, exercises,
                desc: document.getElementById('routineDesc').value.trim(),
                days: [...state.selectedDays],
            };
        }
        showToast('Rutina actualizada ✓');
    } else {
        state.routines.push({
            id: uid(), name, exercises,
            desc: document.getElementById('routineDesc').value.trim(),
            days: [...state.selectedDays],
            createdAt: new Date().toISOString(),
        });
        showToast('Rutina creada ✓');
    }

    saveState();
    closeModal('modalRoutine');
    renderRoutines();
}

function addExerciseRow(ex = null) {
    const container = document.getElementById('exercisesInRoutine');
    const row = document.createElement('div');
    row.className = 'exercise-row';

    const exOptions = state.exercises.map(e =>
        `<option value="${e.name}" ${ex && ex.name === e.name ? 'selected' : ''}>${e.name}</option>`
    ).join('');

    row.innerHTML = `
        <select class="ex-name">
            <option value="">— Ejercicio —</option>
            ${exOptions}
        </select>
        <input class="ex-sets" type="number" placeholder="Series" min="1" max="20" value="${ex ? ex.sets : 3}">
        <input class="ex-reps" type="text" placeholder="Reps" value="${ex ? ex.reps : '10'}">
        <button type="button" class="btn-remove-ex" onclick="this.closest('.exercise-row').remove()">✕</button>
    `;
    container.appendChild(row);
}

function openRoutineDetail(id) {
    const r = state.routines.find(r => r.id === id);
    if (!r) return;

    document.getElementById('detailRoutineName').textContent = r.name;

    document.getElementById('detailRoutineBody').innerHTML = `
        ${r.days && r.days.length ? `<div style="margin-bottom:12px;display:flex;gap:5px;flex-wrap:wrap">
            ${r.days.map(d => `<span class="day-tag">${d}</span>`).join('')}
        </div>` : ''}
        ${r.desc ? `<p class="detail-desc">${r.desc}</p>` : ''}
        <p class="detail-exercises-title">${r.exercises.length} Ejercicio${r.exercises.length !== 1 ? 's' : ''}</p>
        ${r.exercises.map((ex, i) => `
            <div class="detail-exercise-item">
                <div class="det-ex-num">${i + 1}</div>
                <span class="det-ex-name">${ex.name}</span>
                <span class="det-ex-sets">${ex.sets} × ${ex.reps}</span>
            </div>
        `).join('')}
    `;

    document.getElementById('btnDeleteRoutine').onclick = () => deleteRoutine(id);
    document.getElementById('btnEditRoutine').onclick   = () => {
        closeModal('modalRoutineDetail');
        openNewRoutineModal(id);
    };

    openModal('modalRoutineDetail');
}

function deleteRoutine(id) {
    if (!confirm('¿Eliminar esta rutina?')) return;
    state.routines = state.routines.filter(r => r.id !== id);
    saveState();
    closeModal('modalRoutineDetail');
    renderRoutines();
    showToast('Rutina eliminada');
}

// Day picker
document.getElementById('dayPicker').addEventListener('click', e => {
    const btn = e.target.closest('.day-btn');
    if (!btn) return;
    const day = btn.dataset.day;
    btn.classList.toggle('selected');
    if (state.selectedDays.includes(day)) {
        state.selectedDays = state.selectedDays.filter(d => d !== day);
    } else {
        state.selectedDays.push(day);
    }
});

document.getElementById('btnNewRoutine').addEventListener('click', () => openNewRoutineModal());

// ============================================================
// SESSIONS
// ============================================================
function renderSessions() {
    const list  = document.getElementById('sessionsList');
    const empty = document.getElementById('sessionsEmpty');
    const sorted = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));

    if (!sorted.length) {
        list.innerHTML = '';
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        const intensityLabels = { 1: '😴 Suave', 2: '💪 Normal', 3: '🔥 Intenso', 4: '⚡ Extremo' };
        list.innerHTML = sorted.map(s => {
            const { day, month } = getDayMonth(s.date);
            return `
            <div class="session-card">
                <div class="session-date-block">
                    <div class="session-day">${day}</div>
                    <div class="session-month">${month}</div>
                </div>
                <div class="session-info">
                    <div class="session-routine-name">${s.routineName || 'Sesión libre'}</div>
                    <div class="session-meta">${s.duration ? `⏱ ${s.duration} min` : ''}</div>
                    ${s.notes ? `<div class="session-notes">${s.notes}</div>` : ''}
                </div>
                <span class="intensity-badge intensity-${s.intensity || 2}">${intensityLabels[s.intensity || 2]}</span>
                <button class="btn-delete-session" onclick="deleteSession('${s.id}')" title="Eliminar">🗑</button>
            </div>`;
        }).join('');
    }

    document.getElementById('statTotalSessions').textContent = state.sessions.length;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const thisWeek = state.sessions.filter(s => new Date(s.date + 'T12:00:00') >= weekStart).length;
    document.getElementById('statThisWeek').textContent = thisWeek;
    document.getElementById('statStreak').textContent = calcStreak();
}

function calcStreak() {
    if (!state.sessions.length) return 0;
    const dates = [...new Set(state.sessions.map(s => s.date))].sort().reverse();
    let streak = 0;
    let prev = new Date();
    prev.setHours(12, 0, 0, 0);
    for (const d of dates) {
        const cur  = new Date(d + 'T12:00:00');
        const diff = Math.round((prev - cur) / 86400000);
        if (diff <= 1) { streak++; prev = cur; } else break;
    }
    return streak;
}

function openLogSessionModal() {
    document.getElementById('sessionDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('sessionDuration').value = '';
    document.getElementById('sessionNotes').value = '';
    state.selectedIntensity = 3;
    document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.intensity-btn[data-val="3"]').classList.add('active');

    const sel = document.getElementById('sessionRoutine');
    sel.innerHTML = '<option value="">— Sesión libre —</option>';
    state.routines.forEach(r => {
        sel.innerHTML += `<option value="${r.id}">${r.name}</option>`;
    });

    openModal('modalSession');
}

function saveSession() {
    const date = document.getElementById('sessionDate').value;
    if (!date) { showToast('Seleccioná una fecha', 'error'); return; }

    const routineId = document.getElementById('sessionRoutine').value;
    const routine   = state.routines.find(r => r.id === routineId);

    state.sessions.push({
        id: uid(), date,
        routineId:    routineId || null,
        routineName:  routine ? routine.name : 'Sesión libre',
        duration:     parseInt(document.getElementById('sessionDuration').value) || null,
        notes:        document.getElementById('sessionNotes').value.trim(),
        intensity:    state.selectedIntensity,
    });

    saveState();
    closeModal('modalSession');
    renderSessions();
    showToast('Sesión registrada ✓');
}

function deleteSession(id) {
    state.sessions = state.sessions.filter(s => s.id !== id);
    saveState();
    renderSessions();
    showToast('Sesión eliminada');
}

document.getElementById('btnLogSession').addEventListener('click', openLogSessionModal);

document.getElementById('intensityPicker').addEventListener('click', e => {
    const btn = e.target.closest('.intensity-btn');
    if (!btn) return;
    document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedIntensity = parseInt(btn.dataset.val);
});

// ============================================================
// PROGRESS
// ============================================================
function renderProgress() {
    const period = state.progressPeriod;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);

    const filtered = state.sessions.filter(s => new Date(s.date + 'T12:00:00') >= cutoff);
    const empty = document.getElementById('progressEmpty');
    empty.style.display = !state.sessions.length ? 'block' : 'none';

    document.getElementById('statAvgPerWeek').textContent = ((filtered.length / (period / 7))).toFixed(1);
    document.getElementById('statBestStreak').textContent = calcStreak();
    document.getElementById('statTotalMinutes').textContent = filtered.reduce((s, se) => s + (se.duration || 0), 0);

    renderBarChart('chartSessions', filtered, period, 'var(--accent)');
    renderDurationChart('chartDuration', filtered, period);
    renderHeatmap('heatmap');
}

function getDaysArray(period) {
    const days = [];
    for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

function renderBarChart(containerId, sessions, period, color = 'var(--accent)') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const days = getDaysArray(period);
    const counts = {};
    days.forEach(d => { counts[d] = 0; });
    sessions.forEach(s => { if (counts[s.date] !== undefined) counts[s.date]++; });
    const max = Math.max(1, ...Object.values(counts));
    const showDays = period > 14 ? days.slice(-14) : days;

    container.innerHTML = showDays.map(d => {
        const v = counts[d] || 0;
        const pct = (v / max) * 100;
        const dt  = new Date(d + 'T12:00:00');
        const lbl = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('. ', '<br>');
        return `<div class="bar-wrap">
            <div class="bar" style="height:${Math.max(pct, v ? 6 : 2)}%;background:${color};opacity:${v ? '0.85' : '0.18'}" title="${v} sesión(es)"></div>
            <div class="bar-label">${lbl}</div>
        </div>`;
    }).join('');
}

function renderDurationChart(containerId, sessions, period) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const days = getDaysArray(period);
    const durMap = {};
    days.forEach(d => { durMap[d] = []; });
    sessions.forEach(s => { if (durMap[s.date] !== undefined && s.duration) durMap[s.date].push(s.duration); });
    const avgs = {};
    days.forEach(d => {
        const arr = durMap[d];
        avgs[d] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    });
    const max = Math.max(1, ...Object.values(avgs));
    const showDays = period > 14 ? days.slice(-14) : days;

    container.innerHTML = showDays.map(d => {
        const v   = avgs[d] || 0;
        const pct = (v / max) * 100;
        const dt  = new Date(d + 'T12:00:00');
        const lbl = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('. ', '<br>');
        return `<div class="bar-wrap">
            <div class="bar" style="height:${Math.max(pct, v ? 6 : 2)}%;background:var(--blue);opacity:${v ? '0.85' : '0.18'}" title="${v} min"></div>
            <div class="bar-label">${lbl}</div>
        </div>`;
    }).join('');
}

function renderHeatmap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const counts = {};
    state.sessions.forEach(s => { counts[s.date] = (counts[s.date] || 0) + 1; });
    const cells = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        cells.push(d.toISOString().slice(0, 10));
    }
    container.innerHTML = cells.map(d => {
        const count = counts[d] || 0;
        const c = Math.min(count, 3);
        const dt  = new Date(d + 'T12:00:00');
        const lbl = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
        return `<div class="heatmap-cell" data-count="${c}" title="${lbl}: ${count} sesión(es)"></div>`;
    }).join('');
}

document.getElementById('progressPeriod').addEventListener('change', e => {
    state.progressPeriod = parseInt(e.target.value);
    renderProgress();
});

// ============================================================
// EXERCISES
// ============================================================
function renderExercises() {
    const grid   = document.getElementById('exercisesGrid');
    const search = document.getElementById('exerciseSearch').value.toLowerCase();
    const muscle = state.muscleFilter;

    let exercises = state.exercises.filter(e => {
        const matchMuscle  = muscle === 'all' || e.muscle === muscle;
        const matchSearch  = !search || e.name.toLowerCase().includes(search) || (e.desc || '').toLowerCase().includes(search);
        return matchMuscle && matchSearch;
    });

    const typeIcon = { fuerza: '🏋️ Fuerza', cardio: '🏃 Cardio', movilidad: '🧘 Movilidad' };
    const canManage = isTrainer();

    grid.innerHTML = exercises.map(e => `
        <div class="exercise-card">
            <div class="exercise-card-top">
                <div class="exercise-card-name">${e.name}</div>
                <span class="muscle-badge muscle-${e.muscle}">${e.muscle}</span>
            </div>
            <div class="exercise-type-tag">${typeIcon[e.type] || e.type}</div>
            ${e.desc ? `<p class="exercise-desc">${e.desc}</p>` : ''}
            ${canManage && !DEFAULT_EXERCISES.find(d => d.id === e.id) ? `
                <div style="margin-top:10px;">
                    <button class="btn btn-danger btn-sm" onclick="deleteExercise('${e.id}')">Eliminar</button>
                </div>` : ''}
        </div>
    `).join('');

    if (!exercises.length) {
        grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><h3>Sin resultados</h3><p>Probá con otro filtro</p></div>`;
    }
}

function deleteExercise(id) {
    if (!isTrainer()) { showToast('Solo los entrenadores pueden eliminar ejercicios', 'error'); return; }
    state.exercises = state.exercises.filter(e => e.id !== id);
    saveState();
    renderExercises();
    showToast('Ejercicio eliminado');
}

document.getElementById('muscleFilters').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.muscleFilter = chip.dataset.muscle;
    renderExercises();
});

document.getElementById('exerciseSearch').addEventListener('input', () => renderExercises());

document.getElementById('btnNewExercise').addEventListener('click', () => {
    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseDesc').value = '';
    openModal('modalExercise');
});

function saveExercise() {
    if (!isTrainer()) { showToast('Solo los entrenadores pueden agregar ejercicios', 'error'); return; }
    const name = document.getElementById('exerciseName').value.trim();
    if (!name) { showToast('Ingresá un nombre', 'error'); return; }

    state.exercises.push({
        id:     uid(),
        name,
        muscle: document.getElementById('exerciseMuscle').value,
        type:   document.getElementById('exerciseType').value,
        desc:   document.getElementById('exerciseDesc').value.trim(),
    });

    saveState();
    closeModal('modalExercise');
    renderExercises();
    showToast('Ejercicio agregado ✓');
}

// ============================================================
// ATHLETES (trainer only)
// ============================================================
function renderAthletes() {
    if (!isTrainer()) return;

    const grid = document.getElementById('athletesGrid');
    const today = new Date().toISOString().slice(0, 10);

    document.getElementById('statTotalAthletes').textContent = MOCK_ATHLETES.length;
    document.getElementById('statActiveTodayAthletes').textContent = MOCK_ATHLETES.filter(a => a.lastSession === today).length;
    document.getElementById('statTotalSessionsAllAthletes').textContent = MOCK_ATHLETES.reduce((s, a) => s + a.sessions, 0);

    grid.innerHTML = MOCK_ATHLETES.map(a => `
        <div class="athlete-card">
            <div class="athlete-card-top">
                <div class="athlete-avatar">${a.avatar}</div>
                <div class="athlete-info">
                    <div class="athlete-name">${a.name}</div>
                    <div class="athlete-email">${a.email}</div>
                </div>
            </div>
            <div class="athlete-stats">
                <div class="athlete-stat">
                    <span class="athlete-stat-val">${a.sessions}</span>
                    <span class="athlete-stat-lbl">Sesiones</span>
                </div>
                <div class="athlete-stat">
                    <span class="athlete-stat-val">${a.routines}</span>
                    <span class="athlete-stat-lbl">Rutinas</span>
                </div>
            </div>
            <div class="athlete-last-session">
                Última sesión: <strong>${formatDate(a.lastSession)}</strong>
            </div>
            <div class="athlete-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="showToast('Próximamente: ver progreso de ${a.name}')">Ver progreso</button>
                <button class="btn btn-primary btn-sm" onclick="showToast('Próximamente: asignar rutina a ${a.name}')">Asignar rutina</button>
            </div>
        </div>
    `).join('');
}

// Invite athlete button
document.getElementById('btnNewAthlete')?.addEventListener('click', () => {
    showToast('Próximamente: invitar nuevo alumno');
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initRoleBasedUI();
    initNav();
    initSidebar();
    renderRoutines();
});
