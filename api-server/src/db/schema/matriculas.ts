import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { estudiantesTable } from "./estudiantes";

export const estadoPagoEnum = pgEnum("estado_pago", [
  "PENDIENTE",
  "APROBADO",
  "RECHAZADO",
  "REVISION_MANUAL",
]);

export const metodoPagoEnum = pgEnum("metodo_pago", [
  "PSE",
  "TARJETA",
  "EFECTIVO",
  "CONSIGNACION",
  "TRANSFERENCIA",
]);

export const matriculasTable = pgTable("matriculas", {
  id: serial("id").primaryKey(),
  estudianteId: integer("estudiante_id").notNull().references(() => estudiantesTable.id),
  anioLectivo: integer("anio_lectivo").notNull(),
  montoTotal: numeric("monto_total", { precision: 12, scale: 2, mode: "number" }).notNull(),
  referenciaPago: text("referencia_pago").notNull().unique(),
  estadoPago: estadoPagoEnum("estado_pago").notNull().default("PENDIENTE"),
  metodoPago: metodoPagoEnum("metodo_pago"),
  comprobanteUrl: text("comprobante_url"),
  fechaPago: timestamp("fecha_pago", { withTimezone: true }),
  fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  fechaActualizacion: timestamp("fecha_actualizacion", { withTimezone: true }).notNull().defaultNow(),
});

export const transaccionesTable = pgTable("transacciones", {
  id: serial("id").primaryKey(),
  matriculaId: integer("matricula_id").notNull().references(() => matriculasTable.id),
  idTransaccionPasarela: text("id_transaccion_pasarela").notNull().unique(),
  monto: numeric("monto", { precision: 12, scale: 2, mode: "number" }).notNull(),
  estadoPasarela: text("estado_pasarela").notNull(),
  respuestaRaw: jsonb("respuesta_raw"),
  fechaTransaccion: timestamp("fecha_transaccion", { withTimezone: true }).notNull().defaultNow(),
});

export type Matricula = typeof matriculasTable.$inferSelect;
export type InsertMatricula = typeof matriculasTable.$inferInsert;
export type Transaccion = typeof transaccionesTable.$inferSelect;
