import app from "./app";
import { logger } from "./lib/logger";

/**
 * Local development / container entry point.
 *
 * On Vercel this file is never executed: the platform imports the Express
 * application directly from `api/index.ts` and `api/[...path].ts`, which both
 * re-export `src/app.ts`.
 */
if (!process.env.VERCEL) {
  const rawPort = process.env.PORT ?? "3000";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (error) => {
    if (error) {
      logger.error({ err: error }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

export default app;

