import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample 10% of transactions in production
  tracesSampleRate: 0.1,

  // Capture 100% of errors
  replaysOnErrorSampleRate: 1.0,
  // Sample 1% of sessions for replay
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration(),
  ],
});
