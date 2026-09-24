import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { adminLoginHandler } from "./routes/admin";
import { logger } from "./lib/logger";
import { loadEnv } from "./lib/env";

loadEnv();

const app: Express = express();

app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true }));
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));

// Accept both Vercel's /api-prefixed path and direct Express-style requests.
app.post("/api/admin/login", adminLoginHandler);
app.post("/admin/login", adminLoginHandler);

/**
 * Normalises the request path so the router always sees the `/api` prefix.
 *
 * Locally (Express server / Vite proxy) and with `api/[...path].ts` on Vercel
 * the prefix is already present, but the `api/index.ts` function receives
 * `/index`, and a rewrite could deliver `/settings` instead of `/api/settings`.
 * Handling both cases here keeps every deployment shape working.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  const url = req.url || "/";
  if (!url.startsWith("/api")) {
    req.url = url === "/" ? "/api" : `/api${url}`;
  }
  next();
});

app.use("/api", router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err: error }, "Error no controlado en la API");
  res.status(500).json({ error: "Ocurrió un error inesperado. Inténtalo de nuevo." });
});

export default app;

