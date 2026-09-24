/**
 * Captura todas las rutas bajo /api/* y las entrega al mismo handler Express.
 * Esto evita depender de rewrites para que Vercel resuelva /api/admin/login.
 */
// @ts-ignore El bundle .cjs/.d.cts se genera durante el build.
import app from "../api-server/dist/serverless.cjs";

export default app;