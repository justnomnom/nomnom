import * as Sentry from "@sentry/nextjs";

import { SENTRY_API, INTEGRATION_FLAGS } from "./src/config-global";

// Skip Sentry initialization in development for faster compilation
const isDev = process.env.NODE_ENV === 'development';

if (!isDev && INTEGRATION_FLAGS.sentry && SENTRY_API.dsn) {
    Sentry.init({
        dsn: SENTRY_API.dsn,
        tracesSampleRate: SENTRY_API.tracesSampleRate,
        debug: SENTRY_API.debug,
        environment: SENTRY_API.environment,

        // Enable performance monitoring
        enableTracing: true,

        // Configure integrations for server-side
        integrations: [
            // Only add profiling integration if available (may not be available in all Sentry versions or with Turbopack)
            ...(typeof Sentry.nodeProfilingIntegration === 'function' 
                ? [Sentry.nodeProfilingIntegration()] 
                : []),
        ],

        // Set up beforeSend to filter out certain errors if needed
        beforeSend(event, hint) {
            // Log the error for debugging
            if (SENTRY_API.debug) {
                console.log('Sentry: Capturing error:', event.exception?.values?.[0]?.value);
            }
            return event;
        },
    });
} 