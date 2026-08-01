import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "crypto";

type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  reqId: string;
  username?: string;
  route?: string;
  [key: string]: any;
}

export const logStorage = new AsyncLocalStorage<LogContext>();

interface LogParams {
  module: string;
  action: string;
  status?: "STARTED" | "SUCCESS" | "FAILED";
  durationMs?: number;
  message?: string;
  error?: any;
  [key: string]: any;
}

/**
 * Run a function within a new logging context.
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return logStorage.run(context, fn);
}

function formatLog(level: LogLevel, params: LogParams): string {
  const context = logStorage.getStore() || ({} as Partial<LogContext>);
  
  const logObject = {
    level,
    timestamp: new Date().toISOString(),
    reqId: context.reqId || "sys-background",
    username: context.username || "anonymous",
    route: context.route,
    ...params,
  };

  // Ensure errors are serialized cleanly
  if (logObject.error instanceof Error) {
    logObject.error = {
      message: logObject.error.message,
      name: logObject.error.name,
      stack: logObject.error.stack,
    };
  }

  return JSON.stringify(logObject);
}

export const logger = {
  info: (params: LogParams) => {
    console.log(formatLog("info", params));
  },
  warn: (params: LogParams) => {
    console.warn(formatLog("warn", params));
  },
  error: (params: LogParams) => {
    console.error(formatLog("error", params));
  },
  debug: (params: LogParams) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", params));
    }
  },
  
  /**
   * Generates a unique request ID.
   */
  generateReqId: () => {
    return `req-${crypto.randomBytes(8).toString("hex")}`;
  },
};
