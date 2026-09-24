/**
 * Genera el bundle que Vercel ejecuta como función serverless:
 *   api-server/dist/serverless.cjs   (autocontenido, formato CommonJS)
 *   api-server/dist/serverless.d.cts (tipos para `api/index.ts`)
 *
 * Se usa durante el build de Vercel (`npm run build:serverless`) antes de que
 * la plataforma empaquete las funciones de `api/`. Al ser un único archivo ya
 * compilado no hay problemas de resolución de módulos, extensiones ni ESM/CJS.
 */
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const apiServerDir = path.resolve(scriptsDir, "..");
const distDir = path.resolve(apiServerDir, "dist");

await mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.resolve(apiServerDir, "src/serverless.ts")],
  outfile: path.resolve(distDir, "serverless.cjs"),
  platform: "node",
  target: "node20",
  format: "cjs",
  bundle: true,
  sourcemap: false,
  logLevel: "info",
  define: {
    // Evita transports/workers de pino dentro de la función serverless.
    "process.env.NODE_ENV": '"production"',
  },
  external: [
    // Dependencias con `require` dinámico o workers: se resuelven desde
    // node_modules en tiempo de ejecución (declaradas en el package.json raíz).
    "pino",
    "pino-http",
    "pino-pretty",
    "thread-stream",
    // Nativos opcionales de `ws`.
    "bufferutil",
    "utf-8-validate",
    "*.node",
  ],
  // `module.exports = app` para que el handler sea la propia app de Express
  // independientemente de cómo Node/Vercel resuelva la interoperabilidad ESM/CJS.
  footer: { js: "module.exports = module.exports.default;" },
});

await writeFile(
  path.resolve(distDir, "serverless.d.cts"),
  [
    'import type { Express } from "express";',
    "",
    "declare const app: Express;",
    "",
    "export = app;",
    "",
  ].join("\n"),
  "utf8",
);

console.log("Bundle serverless generado en api-server/dist/serverless.cjs");
