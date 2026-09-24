import { existsSync } from "node:fs";
import path from "node:path";

type ProcessWithEnvFile = NodeJS.Process & {
  loadEnvFile?: (filePath?: string) => void;
};

let loaded = false;

/**
 * Loads environment variables from `.env.local` / `.env` when running locally
 * (Windows, macOS, Linux). On Vercel the variables are injected by the
 * platform, so this helper is a no-op there.
 *
 * Uses the native `process.loadEnvFile` (Node.js >= 20.12) so that no extra
 * dependency is required.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  if (process.env.VERCEL) return;

  const loadEnvFile = (process as ProcessWithEnvFile).loadEnvFile;
  if (typeof loadEnvFile !== "function") return;

  for (const file of [".env.local", ".env"]) {
    const fullPath = path.resolve(process.cwd(), file);
    if (!existsSync(fullPath)) continue;
    try {
      loadEnvFile(fullPath);
    } catch {
      // Ignore malformed or missing files: the platform variables still apply.
    }
  }
}
