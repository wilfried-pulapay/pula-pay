import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.config';

export const authHandler = toNodeHandler(auth);
