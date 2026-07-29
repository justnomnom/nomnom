import * as Sentry from "@sentry/nextjs";

import { SENTRY_API, INTEGRATION_FLAGS } from "./src/config-global";

// Skip Sentry initialization in development for faster compilation
const isDev = process.env.NODE_ENV === "development";

if (!isDev && INTEGRATION_FLAGS.sentry && SENTRY_API.dsn) {
  Sentry.init({
    dsn: SENTRY_API.dsn,
    tracesSampleRate: SENTRY_API.tracesSampleRate,
    debug: SENTRY_API.debug,
    environment: SENTRY_API.environment,
    enableTracing: true,
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
