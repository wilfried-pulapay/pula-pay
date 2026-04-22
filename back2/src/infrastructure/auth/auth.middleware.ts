import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.config';
import { ApiResponse } from '../../shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phoneNumber?: string;
        kycLevel?: string;
        displayCurrency?: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

    if (!session) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session',
        },
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.user = {
      id: session.user.id,
      phoneNumber: (session.user as any).phoneNumber,
      kycLevel: (session.user as any).kycLevel,
      displayCurrency: (session.user as any).displayCurrency,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      },
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
