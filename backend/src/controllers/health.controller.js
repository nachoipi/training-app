export const getStatus = (req, res) => {
    res.json({
        status: 'ok',
        message: 'FitCore API running',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
    });
};

export const getHealth = (req, res) => {
    res.json({ health: 'ok', uptime: process.uptime() });
};
