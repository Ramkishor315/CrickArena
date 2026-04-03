/**
 * Global Express error handler.
 * Catches any error passed via next(err) and returns a structured JSON response.
 */
export const errorHandler = (err, _req, res, _next) => {
  console.error('💥 Error:', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/** Utility: create a structured API error */
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
