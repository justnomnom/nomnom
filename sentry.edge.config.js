import * as Sentry from "@sentry/nextjs";

import { SENTRY_API, INTEGRATION_FLAGS } from "./src/config-global";
import { beforeSendLog } from "./src/libs/sentry/before-send-log";

// Skip Sentry initialization in development for faster compilation
const isDev = process.env.NODE_ENV === "development";

if (!isDev && INTEGRATION_FLAGS.sentry && SENTRY_API.dsn) {
  Sentry.init({
    dsn: SENTRY_API.dsn,
    // Tracing must be enabled for agent monitoring to work
    tracesSampleRate: SENTRY_API.tracesSampleRate,
    debug: SENTRY_API.debug,
    environment: SENTRY_API.environment,
    enableLogs: true,
    beforeSendLog,
    enableTracing: true,
    dataCollection: {
      genAI: { inputs: true, outputs: true },
    },
    // Not enabled by default on Edge — required for AI SDK spans there
    integrations: [
      Sentry.vercelAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      }),
    ],
    beforeSend(event, hint) {
      if (SENTRY_API.debug) {
        console.log(
          "Sentry: Capturing error:",
          event.exception?.values?.[0]?.value
        );
      }
      return event;
    },
  });
}
