const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// AUTH — USERS (reemplazar con DB + bcrypt en producción)
// ============================================================
const USERS = [
    {
        id: 'trainer1',
        email: 'trainer@fitcore.com',
        password: '123456',
        role: 'trainer',
        name: 'Coach Pro',
        avatar: 'C',
    },
    {
        id: 'nacho1',
        email: 'nacho@fitcore.com',
        password: '123456',
        role: 'athlete',
        name: 'Nacho',
        avatar: 'N',
    }
];

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function createToken(user) {
    const payload = {
        userId: user.id,
        role:   user.role,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
        iat:    Date.now(),
        exp:    Date.now() + TOKEN_TTL_MS,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (!payload.exp || payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

// ---- Middleware ----
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
    }
    const payload = verifyToken(header.slice(7));
    if (!payload) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
    req.user = payload;
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acceso denegado para tu rol.' });
        }
        next();
    };
}

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user || user.password !== password) {
        // Mismo mensaje para evitar enumeración de usuarios
        return res.status(401).json({ error: 'Credenciales incorrectas. Verificá tus datos.' });
    }

    const token = createToken(user);

    res.json({
        token,
        user: {
            id:     user.id,
            name:   user.name,
            email:  user.email,
            role:   user.role,
            avatar: user.avatar,
        },
    });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// POST /api/auth/logout (el cliente limpia el token, el servidor puede blacklistear si hay DB)
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Sesión cerrada correctamente.' });
});

// ============================================================
// IN-MEMORY DATA STORE
// ============================================================
let exercises = [
    { id: 'e1',  name: 'Press de Banca',          muscle: 'pecho',   type: 'fuerza',    desc: 'Ejercicio compuesto para el pecho con barra o mancuernas.' },
    { id: 'e2',  name: 'Press Inclinado',          muscle: 'pecho',   type: 'fuerza',    desc: 'Variante que enfatiza la parte superior del pecho.' },
    { id: 'e3',  name: 'Dominadas',                muscle: 'espalda', type: 'fuerza',    desc: 'Ejercicio de tracción con peso corporal.' },
    { id: 'e4',  name: 'Remo con Barra',           muscle: 'espalda', type: 'fuerza',    desc: 'Movimiento de jalón horizontal para espalda media.' },
    { id: 'e5',  name: 'Sentadilla',               muscle: 'piernas', type: 'fuerza',    desc: 'El rey de los ejercicios de piernas.' },
    { id: 'e6',  name: 'Peso Muerto Rumano',       muscle: 'piernas', type: 'fuerza',    desc: 'Isquiotibiales y glúteos.' },
    { id: 'e7',  name: 'Press Militar',            muscle: 'hombros', type: 'fuerza',    desc: 'Press vertical para el deltoides frontal.' },
    { id: 'e8',  name: 'Elevaciones Laterales',    muscle: 'hombros', type: 'fuerza',    desc: 'Aislamiento del deltoides medial.' },
    { id: 'e9',  name: 'Curl de Bíceps',           muscle: 'brazos',  type: 'fuerza',    desc: 'Ejercicio básico de aislamiento para el bíceps.' },
    { id: 'e10', name: 'Extensión de Tríceps',     muscle: 'brazos',  type: 'fuerza',    desc: 'Aislamiento del tríceps con polea o mancuerna.' },
    { id: 'e11', name: 'Plancha',                  muscle: 'core',    type: 'fuerza',    desc: 'Ejercicio isométrico para el core completo.' },
    { id: 'e12', name: 'Abdominales',              muscle: 'core',    type: 'fuerza',    desc: 'Curl abdominal clásico.' },
    { id: 'e13', name: 'Correr',                   muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo a alto impacto.' },
    { id: 'e14', name: 'Bicicleta',                muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo impacto.' },
    { id: 'e15', name: 'Estiramiento de Cadera',   muscle: 'piernas', type: 'movilidad', desc: 'Mejora la movilidad de cadera.' },
];

let routines = [];
let sessions = [];
let planifications = [];
let sessionLogs = [];

// Alumnos mock para el trainer (en producción vendría de la DB)
const MOCK_ATHLETES = [
    { id: 'nacho1',   name: 'Nacho',       email: 'nacho@fitcore.com',   sessions: 24, routines: 3, lastSession: '2026-05-14', avatar: 'N' },
    { id: 'carlos1',  name: 'Carlos M.',   email: 'carlos@example.com',  sessions: 18, routines: 2, lastSession: '2026-05-15', avatar: 'C' }
];

function uid() { return '_' + Math.random().toString(36).slice(2, 10); }

// ============================================================
// EXERCISES
// ============================================================
app.get('/api/exercises', (req, res) => {
    const { muscle, type, q } = req.query;
    let result = [...exercises];
    if (muscle) result = result.filter(e => e.muscle === muscle);
    if (type)   result = result.filter(e => e.type === type);
    if (q)      result = result.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
    res.json({ data: result, total: result.length });
});

app.post('/api/exercises', requireAuth, requireRole('trainer'), (req, res) => {
    const { name, muscle, type, desc } = req.body;
    if (!name || !muscle || !type) return res.status(400).json({ error: 'name, muscle, type son requeridos' });
    const ex = { id: uid(), name, muscle, type, desc: desc || '', createdAt: new Date().toISOString() };
    exercises.push(ex);
    res.status(201).json(ex);
});

app.delete('/api/exercises/:id', requireAuth, requireRole('trainer'), (req, res) => {
    const idx = exercises.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ejercicio no encontrado' });
    exercises.splice(idx, 1);
    res.json({ message: 'Eliminado' });
});

// ============================================================
// ROUTINES
// ============================================================
app.get('/api/routines', requireAuth, (req, res) => {
    // Trainers ven todas; athletes solo las propias
    const result = req.user.role === 'trainer'
        ? routines
        : routines.filter(r => r.userId === req.user.userId);
    res.json({ data: result, total: result.length });
});

app.post('/api/routines', requireAuth, (req, res) => {
    const { name, desc, days, exercises: exs, forUserId } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const routine = {
        id: uid(),
        name, desc: desc || '',
        days: days || [],
        exercises: exs || [],
        userId: forUserId || req.user.userId,  // trainer puede crear para un atleta
        createdBy: req.user.userId,
        createdAt: new Date().toISOString(),
    };
    routines.push(routine);
    res.status(201).json(routine);
});

app.put('/api/routines/:id', requireAuth, (req, res) => {
    const idx = routines.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Rutina no encontrada' });
    const routine = routines[idx];
    // Solo el dueño o un trainer puede editar
    if (req.user.role !== 'trainer' && routine.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Sin permiso para editar esta rutina' });
    }
    routines[idx] = { ...routine, ...req.body, id: req.params.id };
    res.json(routines[idx]);
});

app.delete('/api/routines/:id', requireAuth, (req, res) => {
    const idx = routines.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Rutina no encontrada' });
    const routine = routines[idx];
    if (req.user.role !== 'trainer' && routine.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Sin permiso' });
    }
    routines.splice(idx, 1);
    res.json({ message: 'Eliminada' });
});

// ============================================================
// SESSIONS
// ============================================================
app.get('/api/sessions', requireAuth, (req, res) => {
    const { from, to, userId } = req.query;
    let result = req.user.role === 'trainer'
        ? [...sessions]
        : sessions.filter(s => s.userId === req.user.userId);
    if (from)   result = result.filter(s => s.date >= from);
    if (to)     result = result.filter(s => s.date <= to);
    if (userId && req.user.role === 'trainer') result = result.filter(s => s.userId === userId);
    result.sort((a, b) => b.date.localeCompare(a.date));
    res.json({ data: result, total: result.length });
});

app.post('/api/sessions', requireAuth, (req, res) => {
    const { date, routineId, duration, notes, intensity } = req.body;
    if (!date) return res.status(400).json({ error: 'date es requerido' });
    const routine = routineId ? routines.find(r => r.id === routineId) : null;
    const session = {
        id: uid(), date,
        routineId: routineId || null,
        routineName: routine ? routine.name : 'Sesión libre',
        duration: duration ? parseInt(duration) : null,
        notes: notes || '',
        intensity: intensity || 2,
        userId: req.user.userId,
        createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    res.status(201).json(session);
});

app.delete('/api/sessions/:id', requireAuth, (req, res) => {
    const idx = sessions.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Sesión no encontrada' });
    const session = sessions[idx];
    if (req.user.role !== 'trainer' && session.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Sin permiso' });
    }
    sessions.splice(idx, 1);
    res.json({ message: 'Eliminada' });
});

// ============================================================
// PLANIFICATIONS
// ============================================================
app.get('/api/planifications', requireAuth, (req, res) => {
    const result = req.user.role === 'trainer'
        ? planifications
        : planifications.filter(p => p.athleteId === req.user.userId);
    res.json({ data: result, total: result.length });
});

app.post('/api/planifications', requireAuth, requireRole('trainer'), (req, res) => {
    const { athleteId, name, weeks, weekDays } = req.body;
    if (!athleteId || !name) return res.status(400).json({ error: 'athleteId y name son requeridos' });
    const plan = {
        id: uid(),
        athleteId,
        name,
        weeks: weeks ?? 4,
        weekDays: weekDays ?? [],
        createdBy: req.user.userId,
        createdAt: new Date().toISOString(),
    };
    planifications.push(plan);
    res.status(201).json(plan);
});

app.put('/api/planifications/:id', requireAuth, requireRole('trainer'), (req, res) => {
    const idx = planifications.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Planificación no encontrada' });
    planifications[idx] = { ...planifications[idx], ...req.body, id: req.params.id };
    res.json(planifications[idx]);
});

app.delete('/api/planifications/:id', requireAuth, requireRole('trainer'), (req, res) => {
    const idx = planifications.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Planificación no encontrada' });
    planifications.splice(idx, 1);
    res.json({ message: 'Eliminada' });
});

// ============================================================
// SESSION LOGS
// ============================================================
app.get('/api/session-logs', requireAuth, (req, res) => {
    const { athleteId } = req.query;
    let result = req.user.role === 'trainer'
        ? (athleteId ? sessionLogs.filter(l => l.athleteId === athleteId) : sessionLogs)
        : sessionLogs.filter(l => l.athleteId === req.user.userId);
    res.json({ data: result });
});

app.post('/api/session-logs', requireAuth, requireRole('athlete'), (req, res) => {
    const log = { ...req.body, athleteId: req.user.userId };
    const idx = sessionLogs.findIndex(
        l => l.athleteId === log.athleteId && l.planId === log.planId &&
             l.week === log.week && l.dayNumber === log.dayNumber
    );
    if (idx >= 0) { sessionLogs[idx] = log; } else { sessionLogs.push(log); }
    res.json(log);
});

// ============================================================
// ATHLETES (trainer only)
// ============================================================
app.get('/api/athletes', requireAuth, requireRole('trainer'), (req, res) => {
    res.json({ data: MOCK_ATHLETES, total: MOCK_ATHLETES.length });
});

// ============================================================
// STATS
// ============================================================
app.get('/api/stats', requireAuth, (req, res) => {
    const { days = 30 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const mySessions = req.user.role === 'trainer'
        ? sessions
        : sessions.filter(s => s.userId === req.user.userId);

    const recent = mySessions.filter(s => s.date >= cutoffStr);
    const totalMinutes = recent.reduce((s, se) => s + (se.duration || 0), 0);

    res.json({
        totalSessions: mySessions.length,
        recentSessions: recent.length,
        totalRoutines: routines.length,
        totalMinutes,
        avgPerWeek: ((recent.length / parseInt(days)) * 7).toFixed(1),
    });
});

// ============================================================
// HEALTH
// ============================================================
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'FitCore API running', version: '2.0.0', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ health: 'ok', uptime: process.uptime() });
});

// ============================================================
// CATCH-ALL
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`\n⚡ FitCore API → http://localhost:${PORT}`);
    console.log(`   Trainer: trainer@fitcore.com / 123456`);
    console.log(`   Atleta:  nacho@fitcore.com   / 123456\n`);
});
