/**
 * Entrada para el despliegue Serverless en Vercel.
 *
 * `scripts/build-serverless.mjs` empaqueta este archivo (junto con toda la API)
 * en `dist/serverless.cjs`, y `artifacts/api/index.ts` lo exporta como handler.
 */
import type { Request, Response } from "express";
import app from "./app";

export function handler(req: Request, res: Response): void {
	app(req, res);
}

export default handler;
