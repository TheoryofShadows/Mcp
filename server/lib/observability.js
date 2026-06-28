/**
 * Observability — MCPX
 *
 * Structured logging (pino) + optional error tracking (Sentry). Both are
 * production-grade but zero-config: logging always works; Sentry only activates
 * when SENTRY_DSN is set (same opt-in pattern as Stripe/Descope).
 *
 *   logger        — the shared pino instance
 *   httpLogger    — pino-http request-logging middleware
 *   initSentry()  — call once at startup; no-op without SENTRY_DSN
 *   captureError()— report an exception to Sentry (no-op without SENTRY_DSN)
 */
import pino from "pino";
import pinoHttp from "pino-http";
import * as Sentry from "@sentry/node";

const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : "info"),
  // Never let a stray secret ride along in a logged object.
  redact: ["req.headers.authorization", "password", "token", "*.password", "*.token"],
});

// Don't log the health probe on every poll — it would drown the signal.
export const httpLogger = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === "/api/health" },
});

let sentryOn = false;

export function initSentry() {
  if (!process.env.SENTRY_DSN || sentryOn) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
  });
  sentryOn = true;
  logger.info("Sentry error tracking enabled");
}

export function captureError(err) {
  if (sentryOn) Sentry.captureException(err);
}
