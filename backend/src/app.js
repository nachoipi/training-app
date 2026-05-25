import express from 'express';
import authRoutes          from './routes/auth.routes.js';
import exerciseRoutes      from './routes/exercise.routes.js';
import routineRoutes       from './routes/routine.routes.js';
import sessionRoutes       from './routes/session.routes.js';
import planificationRoutes from './routes/planification.routes.js';
import sessionLogRoutes    from './routes/sessionLog.routes.js';
import athleteRoutes       from './routes/athlete.routes.js';
import statsRoutes         from './routes/stats.routes.js';
import healthRoutes        from './routes/health.routes.js';
import errorMiddleware     from './middlewares/error.middleware.js';

const app = express();

app.use(express.json());

app.use('/api/auth',           authRoutes);
app.use('/api/exercises',      exerciseRoutes);
app.use('/api/routines',       routineRoutes);
app.use('/api/sessions',       sessionRoutes);
app.use('/api/planifications', planificationRoutes);
app.use('/api/session-logs',   sessionLogRoutes);
app.use('/api/athletes',       athleteRoutes);
app.use('/api/stats',          statsRoutes);
app.use('/api',                healthRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use(errorMiddleware);

export default app;
