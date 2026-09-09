/**
 * Enterprise Structured Logger for CycloConnect Main Process
 * Features log level filtering, timestamps, context tags, and automatic secret redaction.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  private currentLevel: number = LOG_LEVELS.INFO;

  constructor() {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      this.currentLevel = LOG_LEVELS.DEBUG;
    }
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = LOG_LEVELS[level];
  }

  private sanitize(message: string): string {
    // Redact bearer tokens, basic auth credentials, and query params
    return message
      .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, '$1[REDACTED]')
      .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]')
      .replace(/(password=)[^&]+/gi, '$1[REDACTED]')
      .replace(/(client_secret=)[^&]+/gi, '$1[REDACTED]');
  }

  private format(tag: string, level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${tag}] ${this.sanitize(message)}`;
  }

  public debug(tag: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(this.format(tag, 'DEBUG', message), ...args);
    }
  }

  public info(tag: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LOG_LEVELS.INFO) {
      console.info(this.format(tag, 'INFO', message), ...args);
    }
  }

  public warn(tag: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LOG_LEVELS.WARN) {
      console.warn(this.format(tag, 'WARN', message), ...args);
    }
  }

  public error(tag: string, message: string, error?: unknown): void {
    if (this.currentLevel <= LOG_LEVELS.ERROR) {
      const errStr = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error || '');
      console.error(this.format(tag, 'ERROR', `${message} ${errStr}`));
    }
  }
}

export const logger = new Logger();

