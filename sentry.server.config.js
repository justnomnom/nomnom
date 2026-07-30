import * as Sentry from "@sentry/nextjs";

import { SENTRY_API, INTEGRATION_FLAGS } from "./src/config-global";
import { beforeSendLog } from "./src/libs/sentry/before-send-log";

// Skip Sentry initialization in development for faster compilation
const isDev = process.env.NODE_ENV === 'development';

if (!isDev && INTEGRATION_FLAGS.sentry && SENTRY_API.dsn) {
    Sentry.init({
        dsn: SENTRY_API.dsn,
        // Tracing must be enabled for agent monitoring to work
        tracesSampleRate: SENTRY_API.tracesSampleRate,
        debug: SENTRY_API.debug,
        environment: SENTRY_API.environment,
        enableLogs: true,
        beforeSendLog,

        // Enable performance monitoring
        enableTracing: true,

        // Control data collection of LLMs and tools (Vercel AI / GenAI spans)
        dataCollection: {
            genAI: { inputs: true, outputs: true },
        },

        // Configure integrations for server-side
        integrations: [
            // Explicit so recordInputs/Outputs stay on even if defaults change
            Sentry.vercelAIIntegration({
                recordInputs: true,
                recordOutputs: true,
            }),
            // Only add profiling integration if available (may not be available in all Sentry versions or with Turbopack)
            ...(typeof Sentry.nodeProfilingIntegration === 'function'
                ? [Sentry.nodeProfilingIntegration()]
                : []),
            Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
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