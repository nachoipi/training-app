const React = window.React;

export function BarChart({ sessions, period, color }) {
    const days = [];
    for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }

    const counts = {};
    days.forEach(d => { counts[d] = 0; });
    sessions.forEach(s => { if (counts[s.date] !== undefined) counts[s.date]++; });

    const max = Math.max(1, ...Object.values(counts));
    const showDays = period > 14 ? days.slice(-14) : days;

    return (
        <div className="chart-container">
            {showDays.map(d => {
                const v = counts[d] || 0;
                const pct = (v / max) * 100;
                const dt = new Date(d + 'T12:00:00');
                const lbl = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
                return (
                    <div key={d} className="bar-wrap">
                        <div
                            className="bar"
                            style={{
                                height: `${Math.max(pct, v ? 6 : 2)}%`,
                                background: color,
                                opacity: v ? 0.85 : 0.18,
                            }}
                            title={`${v} sesión(es)`}
                        />
                        <div className="bar-label">{lbl}</div>
                    </div>
                );
            })}
        </div>
    );
}

export function DurationChart({ sessions, period }) {
    const days = [];
    for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }

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

    return (
        <div className="chart-container">
            {showDays.map(d => {
                const v = avgs[d] || 0;
                const pct = (v / max) * 100;
                const dt = new Date(d + 'T12:00:00');
                const lbl = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
                return (
                    <div key={d} className="bar-wrap">
                        <div
                            className="bar"
                            style={{
                                height: `${Math.max(pct, v ? 6 : 2)}%`,
                                background: 'var(--blue)',
                                opacity: v ? 0.85 : 0.18,
                            }}
                            title={`${v} min`}
                        />
                        <div className="bar-label">{lbl}</div>
                    </div>
                );
            })}
        </div>
    );
}

export function Heatmap({ sessions }) {
    const counts = {};
    sessions.forEach(s => { counts[s.date] = (counts[s.date] || 0) + 1; });

    const cells = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        cells.push(d.toISOString().slice(0, 10));
    }

    return (
        <div className="heatmap-container">
            {cells.map(d => {
                const count = counts[d] || 0;
                const c = Math.min(count, 3);
                const dt = new Date(d + 'T12:00:00');
                const lbl = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                    <div
                        key={d}
                        className="heatmap-cell"
                        data-count={c}
                        title={`${lbl}: ${count} sesión(es)`}
                    />
                );
            })}
        </div>
    );
}
