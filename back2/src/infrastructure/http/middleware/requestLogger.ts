import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../shared/utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  const startTime = Date.now();

  const route = `${req.method} ${req.path}`;

  // Log request
  logger.info(
    {
      requestId,
      ip: req.ip,
      query: Object.keys(req.query).length ? req.query : undefined,
    },
    `--> ${route}`
  );

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    logger[level](
      { requestId, status, duration },
      `<-- ${route} ${status} ${duration}ms`
    );
  });

  next();
}
