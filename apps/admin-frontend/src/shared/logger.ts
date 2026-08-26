export interface LogFields {
  [key: string]: string | number | boolean | null | undefined;
}

function log(level: 'info' | 'warn' | 'error', event: string, fields: LogFields = {}): void {
  console[level === 'info' ? 'log' : level](`[${event}]`, fields);
}

export const logger = {
  info: (event: string, fields?: LogFields) => log('info', event, fields),
  warn: (event: string, fields?: LogFields) => log('warn', event, fields),
  error: (event: string, fields?: LogFields) => log('error', event, fields),
};
