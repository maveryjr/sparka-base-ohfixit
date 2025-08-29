import pino, { type Logger, stdTimeFunctions } from 'pino';

// Prefer JSON in production; pretty in development.
// We also add base bindings so child loggers inherit app metadata.
export const logger: Logger =
  process.env.NODE_ENV === 'production'
    ? pino({
        level: process.env.LOG_LEVEL || 'info',
        base: { app: 'sparka' },
        timestamp: stdTimeFunctions.isoTime,
        redact: {
          paths: [
            'password',
            'headers.authorization',
            'headers.cookie',
            'cookies',
            'token',
          ],
          remove: false,
        },
      })
    : pino({
        level: process.env.LOG_LEVEL || 'debug',
        base: { app: 'sparka' },
        timestamp: stdTimeFunctions.isoTime,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      });

export function createModuleLogger(moduleName: string): Logger {
  return logger.child({ module: moduleName });
}
