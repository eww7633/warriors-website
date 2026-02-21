declare module 'sentry-expo' {
  export function init(options: Record<string, unknown>): void;
  export const Native: {
    captureException: (error: unknown, context?: Record<string, unknown>) => void;
  };
}
