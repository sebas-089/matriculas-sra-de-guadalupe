import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import path from "node:path";

type ProcessWithEnvFile = NodeJS.Process & { loadEnvFile?: (filePath?: string) => void };

const envProcess = process as ProcessWithEnvFile;

// Permite ejecutar `npm run db:push` desde la carpeta del frontend cargando
// las variables de api-server/.env.local o de un .env local.
for (const file of [
  path.resolve(process.cwd(), "..", "api-server", ".env.local"),
  path.resolve(process.cwd(), "..", "api-server", ".env"),
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
]) {
  if (existsSync(file)) {
    try {
      envProcess.loadEnvFile?.(file);
    } catch {
      // Ignore unreadable files.
    }
  }
}

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL must be set to run drizzle-kit (usa api-server/.env.local o exporta la cadena de conexión de Neon).",
  );
}

export default defineConfig({
  // El esquema vive en la API para mantener una única fuente de verdad.
  schema: path.resolve(process.cwd(), "..", "api-server", "src", "db", "schema", "index.ts"),
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
