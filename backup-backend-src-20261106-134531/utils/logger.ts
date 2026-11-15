/* eslint-disable no-console */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Logger minimalista e sem dependencias.
 * O nivel vem de LOG_LEVEL - lido direto do process.env para evitar
 * dependencia circular com config/env.ts.
 */
function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return (['error', 'warn', 'info', 'debug'] as const).includes(raw as LogLevel)
    ? (raw as LogLevel)
    : 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[currentLevel()];
}

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;

  const prefix = `[${timestamp()}] [clyvo] [${level.toUpperCase()}]`;
  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (meta === undefined) {
    target(`${prefix} ${message}`);
    return;
  }

  if (meta instanceof Error) {
    target(`${prefix} ${message}`, `\n${meta.stack ?? meta.message}`);
    return;
  }

  target(`${prefix} ${message}`, meta);
}

export const logger = {
  error: (message: string, meta?: unknown) => write('error', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
};
