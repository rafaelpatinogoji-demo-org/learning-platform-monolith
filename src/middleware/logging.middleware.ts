import { Request, Response, NextFunction } from 'express';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url } = req;
    const { statusCode } = res;
    const requestId = req.requestId;
    
    // One-line per request logging
    console.log(`[${requestId}] ${method} ${url} ${statusCode} ${duration}ms`);
  });
  
  next();
};
