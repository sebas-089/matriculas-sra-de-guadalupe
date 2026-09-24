/**
 * Crea (o actualiza) el administrador principal y la fila de configuración
 * institucional en Neon Postgres.
 *
 * Uso:  npm run db:seed        (desde la carpeta api-server)
 *
 * Variables opcionales: ADMIN_NOMBRE, ADMIN_PASSWORD
 */
import { existsSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  const fullPath = path.resolve(process.cwd(), file);
  if (existsSync(fullPath)) {
    try {
      process.loadEnvFile(fullPath);
    } catch {
      // Ignore unreadable env files.
    }
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Create api-server/.env.local with your Neon connection string.");
  process.exit(1);
}

const adminName = process.env.ADMIN_NOMBRE ?? "Administrador Principal";
const adminEmail = "admin@colegio.edu.co";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Guadalupe2026";

const sql = postgres(databaseUrl, { ssl: "require", prepare: false, max: 1 });

try {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await sql`
    INSERT INTO usuarios_admin (nombre, correo, password_hash, rol, activo)
    VALUES (${adminName}, ${adminEmail}, ${passwordHash}, 'SUPER_ADMIN', true)
    ON CONFLICT (correo) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        password_hash = EXCLUDED.password_hash,
        rol = EXCLUDED.rol,
        activo = true
  `;

  await sql`
    INSERT INTO system_settings (id, admin_password_hash) VALUES (1, ${passwordHash})
    ON CONFLICT (id) DO UPDATE
    SET admin_password_hash = EXCLUDED.admin_password_hash
  `;

  console.log(`Administrador listo: ${adminEmail}`);
  console.log("Configuración institucional lista (system_settings).");
} catch (error) {
  console.error("No fue posible completar el seed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
