import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  // Log error (minimal logging as requested)
  console.error(`[${req.requestId}] Error ${statusCode}: ${message}`);

  // Send consistent JSON error response
  res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
};

// 404 handler for unknown routes
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
};
