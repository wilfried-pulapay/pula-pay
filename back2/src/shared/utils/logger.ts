import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport:
    config.env !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname,env',
            messageFormat: '{msg}',
            singleLine: false,
          },
        }
      : undefined,
  base: {
    env: config.env,
  },
});

export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
