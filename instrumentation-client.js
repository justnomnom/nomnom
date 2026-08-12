'use client';

import * as Sentry from "@sentry/nextjs";

import { SENTRY_API, INTEGRATION_FLAGS } from "./src/config-global";
import { beforeSendLog } from "./src/libs/sentry/before-send-log";

// Skip Sentry initialization in development for faster compilation
const isDev = process.env.NODE_ENV === 'development';

if (!isDev && INTEGRATION_FLAGS.sentry && SENTRY_API.dsn) {
    Sentry.init({
        dsn: SENTRY_API.dsn,
        sendDefaultPii: true,
        // Adjust in production via NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
        tracesSampleRate: SENTRY_API.tracesSampleRate,
        debug: SENTRY_API.debug,
        environment: SENTRY_API.environment,
        enableLogs: true,
        beforeSendLog,

        // Propagate trace headers to same-origin / API hosts (avoids CORS issues)
        tracePropagationTargets: [
            'localhost',
            /^https:\/\/justnomnom\.com\/api/,
            /^https:\/\/.*\.vercel\.app\/api/,
        ],

        // Replay is lazy-loaded below to avoid bloating the initial client bundle
        integrations: [
            Sentry.browserTracingIntegration(),
            // Forward console.warn/error as structured Sentry logs
            Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
        ],

        // Capture Replay for 10% of all sessions,
        // plus for 100% of sessions with an error
        replaysSessionSampleRate: SENTRY_API.replaysSessionSampleRate,
        replaysOnErrorSampleRate: SENTRY_API.replaysOnErrorSampleRate,
    });

    // Defer Session Replay via CDN lazyLoadIntegration when available
    if (typeof Sentry.lazyLoadIntegration === 'function') {
        Sentry.lazyLoadIntegration('replayIntegration')
            .then((replayIntegration) => {
                Sentry.addIntegration(
                    replayIntegration({
                        maskAllText: true,
                        blockAllMedia: true,
                    })
                );
            })
            .catch(() => {
                // Ad blockers / network failures — tracing still works without Replay
            });
    }
}

// This export will instrument router navigations, and is only relevant if you enable tracing.
// `captureRouterTransitionStart` is available from SDK version 9.12.0 onwards
export const onRouterTransitionStart = INTEGRATION_FLAGS.sentry
    ? Sentry.captureRouterTransitionStart
    : () => {};
