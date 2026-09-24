/**
 * Verifica que el bundle serverless (dist/serverless.cjs) se pueda cargar como
 * handler de Vercel y que enrute correctamente.
 *
 * Uso: npm run smoke:serverless   (desde la carpeta api-server)
 */
const baseUrl = process.env.DATABASE_URL ?? "postgresql://user:password@127.0.0.1:5432/smoke";
process.env.DATABASE_URL = baseUrl;
process.env.NODE_ENV = "production";
process.env.JWT_SECRET ??= "smoke-test-secret";

import { createServer, request } from "node:http";
import jwt from "jsonwebtoken";

const handler = (await import("../dist/serverless.cjs")).default;

if (typeof handler !== "function") {
  console.error("El bundle no exporta un handler ejecutable.");
  process.exit(1);
}

const server = createServer(handler);
server.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const { port } = server.address();

const adminToken = jwt.sign({ id: 1, correo: "smoke@test.local", rol: "SUPER_ADMIN" }, process.env.JWT_SECRET, {
  expiresIn: "1h",
});

const call = (path, { method = "GET", token } = {}) =>
  new Promise((resolve, reject) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const req = request({ host: "127.0.0.1", port, path, method, headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });

const checks = [
  { path: "/api/healthz", expected: 200, label: "ruta normal (/api/healthz)" },
  { path: "/healthz", expected: 200, label: "ruta sin prefijo (normalización)" },
  { path: "/api/ruta-inexistente", expected: 404, label: "404 controlado" },
  { path: "/api/settings", expected: 200, label: "configuración institucional (público)" },
  // Rutas nuevas de detalle / eliminación / exportación, protegidas por token.
  { path: "/api/admin/matriculas/1", expected: 401, label: "detalle sin token -> 401" },
  { path: "/api/admin/matriculas/1", method: "DELETE", expected: 401, label: "DELETE admin sin token -> 401" },
  { path: "/api/matriculas/1", method: "DELETE", expected: 401, label: "DELETE /api/matriculas/:id sin token -> 401" },
  { path: "/api/admin/exportar-csv", expected: 401, label: "exportar CSV sin token -> 401" },
  // Con token válido y un id no numérico, la validación responde 400 sin tocar la base de datos.
  { path: "/api/admin/matriculas/abc", token: adminToken, expected: 400, label: "detalle con id inválido -> 400" },
  { path: "/api/matriculas/abc", method: "DELETE", token: adminToken, expected: 400, label: "DELETE con id inválido -> 400" },
  // Con token válido la consulta se ejecuta (sin base de datos -> 500 controlado, no 404/401).
  { path: "/api/admin/exportar-csv", token: adminToken, expected: 500, label: "exportar CSV con token (sin BD -> 500 controlado)" },
];

let failed = 0;

for (const check of checks) {
  const { status, body } = await call(check.path, { method: check.method, token: check.token });
  const ok = status === check.expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${check.label} -> ${status} ${body.slice(0, 70)}`);
}

server.close();
process.exit(failed === 0 ? 0 : 1);