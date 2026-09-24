/**
 * Verifica el contrato del CSV de exportación sin necesidad de una base de datos.
 *
 * Comprueba: BOM UTF-8, saltos CRLF, alineación encabezados/filas, tildes y ñ
 * intactas, escape de comillas y valores nulos vacíos.
 *
 * Uso: npm run check:csv   (desde api-server)
 */
import { CSV_HEADERS, csvFromRows } from "../src/lib/matriculas";

/** Parser mínimo de una línea CSV con comillas y comillas escapadas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

const estudiante = {
  id: 7,
  acudienteId: 3,
  nombreCompleto: "María Muñoz Peña",
  tipoDocumento: "TI",
  documentoIdentidad: "1098765432",
  fechaNacimiento: "2015-07-21",
  gradoAlQueAspira: "Sexto",
  eps: "Sanitas",
  tipoSangre: "O+",
  observacionesMedicas: 'Alergia a la penicilina "ampicilina"',
  fechaRegistro: new Date("2026-01-15T13:45:00Z"),
};

const acudiente = {
  id: 3,
  nombreCompleto: "José Peña Gutiérrez",
  tipoDocumento: "CC",
  documentoIdentidad: "1029384756",
  parentesco: "Padre",
  correo: "jose.pena@example.com",
  telefono: "+57 313 245 8907",
  direccion: "Calle 12 # 4-56, Popayán",
  ocupacion: "Docente",
  fechaRegistro: new Date("2026-01-15T13:40:00Z"),
};

const matriculas = {
  id: 12,
  estudianteId: 7,
  anioLectivo: 2026,
  montoTotal: 1280000,
  referenciaPago: "CENSG-2026-A1B2C3",
  estadoPago: "APROBADO" as const,
  metodoPago: "TRANSFERENCIA" as const,
  comprobanteUrl: null,
  fechaPago: new Date("2026-01-20T09:05:00Z"),
  fechaCreacion: new Date("2026-01-15T13:45:00Z"),
  fechaActualizacion: new Date("2026-01-20T09:05:00Z"),
};

const csv = csvFromRows([
  { matriculas, estudiantes: estudiante, acudientes: acudiente, transaccionesTotal: 2, ultimaTransaccionId: "tx-99", ultimaTransaccionEstado: "APROBADO" },
  {
    matriculas: { ...matriculas, id: 13, referenciaPago: "CENSG-2026-ZZ99", metodoPago: null, comprobanteUrl: null, fechaPago: null },
    estudiantes: { ...estudiante, id: 8, eps: null, tipoSangre: null, observacionesMedicas: null },
    acudientes: { ...acudiente, parentesco: null, direccion: null, ocupacion: null },
    transaccionesTotal: 0,
    ultimaTransaccionId: null,
    ultimaTransaccionEstado: null,
  },
]);

const lines = csv.split("\r\n");
const header = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
const firstRow = parseCsvLine(lines[1]);
const secondRow = parseCsvLine(lines[2]);

const checks = [
  { label: "Inicia con BOM UTF-8 (\\uFEFF)", ok: csv.startsWith("\uFEFF") },
  { label: "Usa saltos CRLF", ok: csv.includes("\r\n") },
  { label: `Encabezados = ${CSV_HEADERS.length} columnas`, ok: header.length === CSV_HEADERS.length },
  { label: "Fila 1 alineada con los encabezados", ok: firstRow.length === header.length },
  { label: "Fila 2 alineada con los encabezados", ok: secondRow.length === header.length },
  { label: "Tildes y ñ intactas (María Muñoz Peña)", ok: csv.includes("María Muñoz Peña") },
  { label: "Acentos en grado/dirección (Popayán)", ok: csv.includes("Popayán") },
  { label: "Comillas escapadas como \"\"", ok: csv.includes('""ampicilina""') },
  { label: "Método de pago nulo → celda vacía", ok: secondRow[header.indexOf("Método de pago")] === "" },
  { label: "Comprobante nulo → celda vacía", ok: secondRow[header.indexOf("Comprobante (URL)")] === "" },
  { label: "Parentesco presente (Padre)", ok: firstRow[header.indexOf("Parentesco")] === "Padre" },
  { label: "Parentesco nulo → celda vacía", ok: secondRow[header.indexOf("Parentesco")] === "" },
  { label: "Estado de la matrícula legible", ok: firstRow[header.indexOf("Estado de la matrícula")] === "Matrícula aprobada" },
  { label: "Fecha formateada para Excel", ok: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(firstRow[header.indexOf("Fecha de pago")]) },
  { label: "Última transacción de pasarela", ok: firstRow[header.indexOf("Último ID de transacción")] === "tx-99" },
  { label: "Contador de transacciones", ok: firstRow[header.indexOf("Transacciones registradas")] === "2" },
  { label: "Se exportan las dos filas", ok: lines.filter(Boolean).length === 3 },
  { label: "Termina con CRLF", ok: csv.endsWith("\r\n") },
];

let failed = 0;
for (const check of checks) {
  if (!check.ok) failed += 1;
  console.log(`${check.ok ? "OK  " : "FAIL"} ${check.label}`);
}

console.log(`\nColumnas exportadas (${CSV_HEADERS.length}):`);
console.log(CSV_HEADERS.map((name, index) => `  ${String(index + 1).padStart(2, " ")}. ${name}`).join("\n"));

process.exit(failed === 0 ? 0 : 1);