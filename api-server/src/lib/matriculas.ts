import { and, desc, eq, ilike, lte, notInArray, or, sql } from "drizzle-orm";
import {
  acudientesTable,
  db,
  estudiantesTable,
  matriculasTable,
  transaccionesTable,
} from "../db";

export type MatriculaView = {
  id: number;
  nombre_estudiante: string;
  documento_estudiante?: string;
  nombre_acudiente?: string;
  correo_acudiente?: string;
  grado: string;
  anio_lectivo: number;
  monto_total: number;
  referencia_pago: string;
  estado_pago: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "REVISION_MANUAL";
  metodo_pago: "PSE" | "TARJETA" | "EFECTIVO" | "CONSIGNACION" | "TRANSFERENCIA" | null;
  fecha_pago: Date | null;
  fecha_creacion: Date;
};

export function toMatriculaView(row: {
  matriculas: typeof matriculasTable.$inferSelect;
  estudiantes: typeof estudiantesTable.$inferSelect;
  acudientes: typeof acudientesTable.$inferSelect;
}): MatriculaView {
  return {
    id: row.matriculas.id,
    nombre_estudiante: row.estudiantes.nombreCompleto,
    documento_estudiante: row.estudiantes.documentoIdentidad,
    nombre_acudiente: row.acudientes.nombreCompleto,
    correo_acudiente: row.acudientes.correo,
    grado: row.estudiantes.gradoAlQueAspira,
    anio_lectivo: row.matriculas.anioLectivo,
    monto_total: Number(row.matriculas.montoTotal),
    referencia_pago: row.matriculas.referenciaPago,
    estado_pago: row.matriculas.estadoPago,
    metodo_pago: row.matriculas.metodoPago,
    fecha_pago: row.matriculas.fechaPago,
    fecha_creacion: row.matriculas.fechaCreacion,
  };
}

/* -------------------------------------------------------------------------- */
/* Detalle completo (estudiante + acudiente + pago + transacciones)             */
/* -------------------------------------------------------------------------- */

export type EstudianteDetail = {
  id: number;
  nombre_completo: string;
  tipo_documento: string;
  documento_identidad: string;
  fecha_nacimiento: string;
  grado_al_que_aspira: string;
  eps: string | null;
  tipo_sangre: string | null;
  observaciones_medicas: string | null;
  fecha_registro: Date;
};

export type AcudienteDetail = {
  id: number;
  nombre_completo: string;
  tipo_documento: string;
  documento_identidad: string;
  parentesco: string | null;
  correo: string;
  telefono: string;
  direccion: string | null;
  ocupacion: string | null;
  fecha_registro: Date;
};

export type TransaccionDetail = {
  id: number;
  id_transaccion_pasarela: string;
  monto: number;
  estado_pasarela: string;
  fecha_transaccion: Date;
};

export type MatriculaDetailView = {
  id: number;
  anio_lectivo: number;
  monto_total: number;
  referencia_pago: string;
  estado_pago: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "REVISION_MANUAL";
  metodo_pago: "PSE" | "TARJETA" | "EFECTIVO" | "CONSIGNACION" | "TRANSFERENCIA" | null;
  comprobante_url: string | null;
  fecha_pago: Date | null;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  estudiante: EstudianteDetail;
  acudiente: AcudienteDetail;
  transacciones: TransaccionDetail[];
};

type MatriculaJoinRow = {
  matriculas: typeof matriculasTable.$inferSelect;
  estudiantes: typeof estudiantesTable.$inferSelect;
  acudientes: typeof acudientesTable.$inferSelect;
};

function toEstudianteDetail(row: typeof estudiantesTable.$inferSelect): EstudianteDetail {
  return {
    id: row.id,
    nombre_completo: row.nombreCompleto,
    tipo_documento: row.tipoDocumento,
    documento_identidad: row.documentoIdentidad,
    fecha_nacimiento: row.fechaNacimiento,
    grado_al_que_aspira: row.gradoAlQueAspira,
    eps: row.eps ?? null,
    tipo_sangre: row.tipoSangre ?? null,
    observaciones_medicas: row.observacionesMedicas ?? null,
    fecha_registro: row.fechaRegistro,
  };
}

function toAcudienteDetail(row: typeof acudientesTable.$inferSelect): AcudienteDetail {
  return {
    id: row.id,
    nombre_completo: row.nombreCompleto,
    tipo_documento: row.tipoDocumento,
    documento_identidad: row.documentoIdentidad,
    parentesco: row.parentesco ?? null,
    correo: row.correo,
    telefono: row.telefono,
    direccion: row.direccion ?? null,
    ocupacion: row.ocupacion ?? null,
    fecha_registro: row.fechaRegistro,
  };
}

function toTransaccionDetail(row: typeof transaccionesTable.$inferSelect): TransaccionDetail {
  return {
    id: row.id,
    id_transaccion_pasarela: row.idTransaccionPasarela,
    monto: Number(row.monto),
    estado_pasarela: row.estadoPasarela,
    fecha_transaccion: row.fechaTransaccion,
  };
}

export function toMatriculaDetailView(
  row: MatriculaJoinRow,
  transacciones: (typeof transaccionesTable.$inferSelect)[] = [],
): MatriculaDetailView {
  return {
    id: row.matriculas.id,
    anio_lectivo: row.matriculas.anioLectivo,
    monto_total: Number(row.matriculas.montoTotal),
    referencia_pago: row.matriculas.referenciaPago,
    estado_pago: row.matriculas.estadoPago,
    metodo_pago: row.matriculas.metodoPago,
    comprobante_url: row.matriculas.comprobanteUrl ?? null,
    fecha_pago: row.matriculas.fechaPago,
    fecha_creacion: row.matriculas.fechaCreacion,
    fecha_actualizacion: row.matriculas.fechaActualizacion,
    estudiante: toEstudianteDetail(row.estudiantes),
    acudiente: toAcudienteDetail(row.acudientes),
    transacciones: transacciones.map(toTransaccionDetail),
  };
}

export async function findMatriculaByReferenceOrDocument(value: string) {
  const rows = await db
    .select()
    .from(matriculasTable)
    .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id))
    .innerJoin(acudientesTable, eq(estudiantesTable.acudienteId, acudientesTable.id))
    .where(
      or(
        eq(matriculasTable.referenciaPago, value),
        eq(estudiantesTable.documentoIdentidad, value),
        eq(acudientesTable.documentoIdentidad, value),
      ),
    )
    .orderBy(desc(matriculasTable.fechaCreacion))
    .limit(1);

  return rows[0] ? toMatriculaView(rows[0]) : undefined;
}

export type MatriculaFilters = {
  estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "REVISION_MANUAL";
  grado?: string;
  busqueda?: string;
};

/** Condiciones compartidas por el listado, la exportación CSV y el detalle. */
export function buildMatriculaFilters(filters: MatriculaFilters) {
  const conditions = [];
  if (filters.estado) conditions.push(eq(matriculasTable.estadoPago, filters.estado));
  if (filters.grado) conditions.push(eq(estudiantesTable.gradoAlQueAspira, filters.grado));
  if (filters.busqueda) {
    const term = `%${filters.busqueda}%`;
    conditions.push(
      or(
        ilike(estudiantesTable.nombreCompleto, term),
        ilike(estudiantesTable.documentoIdentidad, term),
        ilike(acudientesTable.nombreCompleto, term),
        ilike(acudientesTable.documentoIdentidad, term),
        ilike(matriculasTable.referenciaPago, term),
      ),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listMatriculas(
  filters: MatriculaFilters & { limit: number; offset: number },
) {
  const whereClause = buildMatriculaFilters(filters);
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(matriculasTable)
      .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id))
      .innerJoin(acudientesTable, eq(estudiantesTable.acudienteId, acudientesTable.id))
      .where(whereClause)
      .orderBy(desc(matriculasTable.fechaCreacion))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(matriculasTable)
      .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id))
      .innerJoin(acudientesTable, eq(estudiantesTable.acudienteId, acudientesTable.id))
      .where(whereClause),
  ]);

  return {
    matriculas: rows.map(toMatriculaView),
    total: Number(totalRows[0]?.total ?? 0),
  };
}

export async function getDashboardStats() {
  const validMatriculaFilter = and(
    eq(matriculasTable.anioLectivo, 2027),
    lte(matriculasTable.montoTotal, 10_000),
    notInArray(estudiantesTable.gradoAlQueAspira, ["Segundo", "2°", "Tercero", "3°"]),
  );
  const [totals, groupedGrades] = await Promise.all([
    db
      .select({
        totalMatriculas: sql<number>`count(*) filter (where ${validMatriculaFilter})`,
        totalRecaudado: sql<number>`coalesce(sum(case when ${validMatriculaFilter} and ${matriculasTable.estadoPago} = 'APROBADO' then ${matriculasTable.montoTotal} else 0 end), 0)`,
        aprobadas: sql<number>`count(*) filter (where ${matriculasTable.estadoPago} = 'APROBADO')`,
        pendientes: sql<number>`count(*) filter (where ${matriculasTable.estadoPago} = 'PENDIENTE')`,
        revisionManual: sql<number>`count(*) filter (where ${matriculasTable.estadoPago} = 'REVISION_MANUAL')`,
        rechazadas: sql<number>`count(*) filter (where ${matriculasTable.estadoPago} = 'RECHAZADO')`,
      })
      .from(matriculasTable)
      .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id)),
    db
      .select({
        grado: estudiantesTable.gradoAlQueAspira,
        cantidad: sql<number>`count(*)`,
      })
      .from(matriculasTable)
      .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id))
      .groupBy(estudiantesTable.gradoAlQueAspira)
      .orderBy(desc(sql`count(*)`)),
  ]);

  const stats = totals[0];
  return {
    total_recaudado: Number(stats?.totalRecaudado ?? 0),
    total_matriculas: Number(stats?.totalMatriculas ?? 0),
    aprobadas: Number(stats?.aprobadas ?? 0),
    pendientes: Number(stats?.pendientes ?? 0),
    revision_manual: Number(stats?.revisionManual ?? 0),
    rechazadas: Number(stats?.rechazadas ?? 0),
    por_grado: groupedGrades.map((row) => ({
      grado: row.grado,
      cantidad: Number(row.cantidad),
    })),
  };
}

export async function findFullMatriculaById(id: number) {
  const rows = await db
    .select()
    .from(matriculasTable)
    .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id))
    .innerJoin(acudientesTable, eq(estudiantesTable.acudienteId, acudientesTable.id))
    .where(eq(matriculasTable.id, id))
    .limit(1);
  return rows[0];
}

/** Detalle completo de una matrícula: estudiante, acudiente, pago y transacciones. */
export async function getMatriculaDetailById(id: number): Promise<MatriculaDetailView | undefined> {
  const row = await findFullMatriculaById(id);
  if (!row) return undefined;

  const transacciones = await db
    .select()
    .from(transaccionesTable)
    .where(eq(transaccionesTable.matriculaId, id))
    .orderBy(desc(transaccionesTable.fechaTransaccion));

  return toMatriculaDetailView(row, transacciones);
}

/**
 * Elimina una matrícula junto con sus transacciones.
 *
 * Solo se eliminan el estudiante y el acudiente cuando no queden otros registros
 * que los referencien, evitando así violaciones de llave foránea y pérdida de
 * información de otras matrículas (por ejemplo, de años lectivos anteriores).
 */
export async function deleteMatriculaById(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [matricula] = await tx
      .select()
      .from(matriculasTable)
      .where(eq(matriculasTable.id, id))
      .limit(1);

    if (!matricula) return false;

    const [estudiante] = await tx
      .select()
      .from(estudiantesTable)
      .where(eq(estudiantesTable.id, matricula.estudianteId))
      .limit(1);

    await tx.delete(transaccionesTable).where(eq(transaccionesTable.matriculaId, id));
    await tx.delete(matriculasTable).where(eq(matriculasTable.id, id));

    if (estudiante) {
      const otrasMatriculas = await tx
        .select({ id: matriculasTable.id })
        .from(matriculasTable)
        .where(eq(matriculasTable.estudianteId, estudiante.id))
        .limit(1);

      if (otrasMatriculas.length === 0) {
        await tx.delete(estudiantesTable).where(eq(estudiantesTable.id, estudiante.id));

        const otrosEstudiantes = await tx
          .select({ id: estudiantesTable.id })
          .from(estudiantesTable)
          .where(eq(estudiantesTable.acudienteId, estudiante.acudienteId))
          .limit(1);

        if (otrosEstudiantes.length === 0) {
          await tx.delete(acudientesTable).where(eq(acudientesTable.id, estudiante.acudienteId));
        }
      }
    }

    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Exportación CSV (todas las columnas, con BOM para Excel)                     */
/* -------------------------------------------------------------------------- */

/** BOM UTF-8: permite que Excel muestre correctamente tildes y ñ. */
const CSV_BOM = "\uFEFF";

const ESTADO_MATRICULA_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  APROBADO: "Matrícula aprobada",
  RECHAZADO: "Pago rechazado",
  REVISION_MANUAL: "En revision manual",
};

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replaceAll('"', '""')}"`;
}

/** Formato ordenable y legible para Excel: 2026-05-04 14:30 */
function formatCsvDate(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Encabezados en el mismo orden que `matriculaCsvRecord`. */
export const CSV_HEADERS = [
  // Matrícula y pago
  "Referencia de pago",
  "ID matrícula",
  "Año lectivo",
  "Estado de la matrícula",
  "Estado del pago",
  "Método de pago",
  "Monto total",
  "Fecha de pago",
  "Fecha de creación",
  "Última actualización",
  "Comprobante (URL)",
  "Transacciones registradas",
  "Último ID de transacción",
  "Último estado de pasarela",
  // Estudiante
  "Estudiante",
  "Tipo de documento estudiante",
  "Documento estudiante",
  "Fecha de nacimiento",
  "Grado al que aspira",
  "EPS",
  "Tipo de sangre",
  "Observaciones médicas",
  "Fecha de registro estudiante",
  // Acudiente
  "Acudiente",
  "Tipo de documento acudiente",
  "Documento acudiente",
  "Parentesco",
  "Correo acudiente",
  "Teléfono acudiente",
  "Dirección acudiente",
  "Ocupación acudiente",
  "Fecha de registro acudiente",
] as const;

type CsvRow = {
  matriculas: typeof matriculasTable.$inferSelect;
  estudiantes: typeof estudiantesTable.$inferSelect;
  acudientes: typeof acudientesTable.$inferSelect;
  transaccionesTotal: number;
  ultimaTransaccionId: string | null;
  ultimaTransaccionEstado: string | null;
};

/** Construye el CSV completo (BOM + encabezados + filas) a partir de las filas. */
export function csvFromRows(rows: CsvRow[]): string {
  const lines = [CSV_HEADERS.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(matriculaCsvRecord(row).map(csvCell).join(","));
  }

  // CRLF + BOM: máxima compatibilidad con Excel en Windows.
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}

function matriculaCsvRecord(row: CsvRow): string[] {
  const d = toMatriculaDetailView(row, []);
  return [
    // Matrícula y pago
    d.referencia_pago,
    String(d.id),
    String(d.anio_lectivo),
    ESTADO_MATRICULA_LABEL[d.estado_pago] ?? d.estado_pago,
    d.estado_pago,
    d.metodo_pago ?? "",
    String(d.monto_total),
    formatCsvDate(d.fecha_pago),
    formatCsvDate(d.fecha_creacion),
    formatCsvDate(d.fecha_actualizacion),
    d.comprobante_url ?? "",
    String(row.transaccionesTotal ?? 0),
    row.ultimaTransaccionId ?? "",
    row.ultimaTransaccionEstado ?? "",
    // Estudiante
    d.estudiante.nombre_completo,
    d.estudiante.tipo_documento,
    d.estudiante.documento_identidad,
    d.estudiante.fecha_nacimiento,
    d.estudiante.grado_al_que_aspira,
    d.estudiante.eps ?? "",
    d.estudiante.tipo_sangre ?? "",
    d.estudiante.observaciones_medicas ?? "",
    formatCsvDate(d.estudiante.fecha_registro),
    // Acudiente
    d.acudiente.nombre_completo,
    d.acudiente.tipo_documento,
    d.acudiente.documento_identidad,
    d.acudiente.parentesco ?? "",
    d.acudiente.correo,
    d.acudiente.telefono,
    d.acudiente.direccion ?? "",
    d.acudiente.ocupacion ?? "",
    formatCsvDate(d.acudiente.fecha_registro),
  ];
}

/**
 * Genera el CSV de las matrículas que cumplen los filtros indicados, con todas
 * las columnas de estudiante, acudiente y pago, en UTF-8 con BOM.
 */
export async function exportMatriculasCsv(filters: MatriculaFilters = {}): Promise<string> {
  const rows = await db
    .select({
      matriculas: matriculasTable,
      estudiantes: estudiantesTable,
      acudientes: acudientesTable,
      transaccionesTotal: sql<number>`(select count(*)::int from transacciones t where t.matricula_id = ${matriculasTable.id})`,
      ultimaTransaccionId: sql<
        string | null
      >`(select t.id_transaccion_pasarela from transacciones t where t.matricula_id = ${matriculasTable.id} order by t.fecha_transaccion desc limit 1)`,
      ultimaTransaccionEstado: sql<
        string | null
      >`(select t.estado_pasarela from transacciones t where t.matricula_id = ${matriculasTable.id} order by t.fecha_transaccion desc limit 1)`,
    })
    .from(matriculasTable)
    .innerJoin(estudiantesTable, eq(matriculasTable.estudianteId, estudiantesTable.id))
    .innerJoin(acudientesTable, eq(estudiantesTable.acudienteId, acudientesTable.id))
    .where(buildMatriculaFilters(filters))
    .orderBy(desc(matriculasTable.fechaCreacion));

  return csvFromRows(rows as CsvRow[]);
}