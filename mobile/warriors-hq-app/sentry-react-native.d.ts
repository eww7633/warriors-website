declare module '@sentry/react-native' {
  export function init(options: Record<string, unknown>): void;
  export function captureException(error: unknown, options?: Record<string, unknown>): void;
}
