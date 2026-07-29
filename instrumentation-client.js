'use client';

import posthog from 'posthog-js';
import * as Sentry from "@sentry/nextjs";

import { SENTRY_API, INTEGRATION_FLAGS, POSTHOG_API, POSTHOG_JS_INIT_OPTIONS } from "./src/config-global";

// Skip Sentry initialization in development for faster compilation
const isDev = process.env.NODE_ENV === 'development';

if (!isDev && INTEGRATION_FLAGS.sentry && SENTRY_API.dsn) {
    Sentry.init({
        dsn: SENTRY_API.dsn,
        sendDefaultPii: true,
        tracesSampleRate: SENTRY_API.tracesSampleRate,
        debug: SENTRY_API.debug,
        environment: SENTRY_API.environment,

        // Replay may only be enabled for the client-side
        integrations: [
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Capture Replay for 10% of all sessions,
        // plus for 100% of sessions with an error
        replaysSessionSampleRate: SENTRY_API.replaysSessionSampleRate,
        replaysOnErrorSampleRate: SENTRY_API.replaysOnErrorSampleRate,
    });
}

// This export will instrument router navigations, and is only relevant if you enable tracing.
// `captureRouterTransitionStart` is available from SDK version 9.12.0 onwards
export const onRouterTransitionStart = INTEGRATION_FLAGS.sentry
    ? Sentry.captureRouterTransitionStart
    : () => {};

// PostHog client-side initialization (Next.js 15.3+ instrumentation-client approach)
if (INTEGRATION_FLAGS.posthog && POSTHOG_API.key && POSTHOG_API.host) {
    posthog.init(POSTHOG_API.key, {
        api_host: POSTHOG_API.host,
        defaults: '2026-05-30',
        capture_exceptions: true,
        ...POSTHOG_JS_INIT_OPTIONS,
        debug: process.env.NODE_ENV === 'development',
    });
} else if (process.env.NODE_ENV === 'development' && INTEGRATION_FLAGS.posthog && !POSTHOG_API.key) {
    console.error(
        'NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured'
    );
}