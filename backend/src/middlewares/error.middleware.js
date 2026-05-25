export default function errorMiddleware(err, req, res, next) {
    console.error(err.stack || err);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message,
    });
}
