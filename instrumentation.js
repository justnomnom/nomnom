import * as Sentry from "@sentry/nextjs";

import { INTEGRATION_FLAGS } from "./src/config-global";

export async function register() {
    if (!INTEGRATION_FLAGS.sentry) {
        return;
    }

    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config");
    }
}

/** Sentry request error hook — only active when INTEGRATION_FLAGS.sentry is true */
export function onRequestError(error) {
    if (INTEGRATION_FLAGS.sentry) {
        Sentry.captureRequestError(error);
    }
}