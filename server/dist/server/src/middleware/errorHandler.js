/**
 * Global Express error handler. Returns sanitized JSON errors and
 * never leaks stack traces in production.
 */
export const errorHandler = (err, _req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    const status = err.status ?? 500;
    const message = err.message || "Internal server error";
    if (process.env.NODE_ENV !== "test") {
        console.error(`[error] ${status} - ${message}`, err.details ?? "");
    }
    res.status(status).json({
        error: message,
        details: process.env.NODE_ENV === "production" ? undefined : err.details,
    });
};
export const notFoundHandler = (_req, res) => {
    res.status(404).json({ error: "Not found" });
};
/**
 * Wraps async Express handlers so thrown errors flow into errorHandler.
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
//# sourceMappingURL=errorHandler.js.map