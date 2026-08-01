import { NextRequest } from "next/server";
import { logger, runWithLogContext } from "./logger";
import { getSession } from "./session";

type RouteHandler = (req: NextRequest, ctx: any) => Promise<Response> | Response;

/**
 * Wraps a Next.js App Router route handler with automated logging and tracing.
 */
export function withLogger(handler: RouteHandler, routeName: string) {
  return async function wrappedHandler(req: NextRequest, ctx: any): Promise<Response> {
    const reqId = logger.generateReqId();
    const startTime = Date.now();
    const method = req.method;

    // We fetch the session at the wrapper level to inject username into the logger context.
    // If the route needs the session, they can still call getSession() and it will hit the DB/cookie again, 
    // or they can just rely on the standard getSession() inside their code.
    // To keep it lightweight, we'll try to get it. If it fails, username is anonymous.
    let username = "anonymous";
    try {
      const session = await getSession();
      if (session) username = session.username;
    } catch {
      // ignore
    }

    const logContext = {
      reqId,
      username,
      route: routeName,
      method,
      url: req.nextUrl.pathname,
    };

    return runWithLogContext(logContext, async () => {
      logger.info({
        module: `api:${routeName}`,
        action: "REQUEST_RECEIVED",
        status: "STARTED",
        message: `Incoming ${method} request to ${req.nextUrl.pathname}`,
      });

      try {
        const response = await handler(req, ctx);
        const durationMs = Date.now() - startTime;
        
        const isSuccess = response.status >= 200 && response.status < 400;
        
        logger.info({
          module: `api:${routeName}`,
          action: "REQUEST_COMPLETED",
          status: isSuccess ? "SUCCESS" : "FAILED",
          durationMs,
          statusCode: response.status,
          message: `Request completed with status ${response.status}`,
        });

        return response;
      } catch (error: any) {
        const durationMs = Date.now() - startTime;
        logger.error({
          module: `api:${routeName}`,
          action: "REQUEST_ERROR",
          status: "FAILED",
          durationMs,
          error,
          message: "Unhandled error in route handler",
        });
        
        // Let Next.js handle or the global error handler handle the raw error if not caught by the route itself
        throw error;
      }
    });
  };
}
