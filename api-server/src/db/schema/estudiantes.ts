import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { acudientesTable } from "./acudientes";

export const estudiantesTable = pgTable("estudiantes", {
  id: serial("id").primaryKey(),
  acudienteId: integer("acudiente_id").notNull().references(() => acudientesTable.id),
  nombreCompleto: text("nombre_completo").notNull(),
  tipoDocumento: text("tipo_documento").notNull(),
  documentoIdentidad: text("documento_identidad").notNull().unique(),
  fechaNacimiento: date("fecha_nacimiento", { mode: "string" }).notNull(),
  gradoAlQueAspira: text("grado_al_que_aspira").notNull(),
  eps: text("eps").notNull(),
  tipoSangre: text("tipo_sangre").notNull(),
  observacionesMedicas: text("observaciones_medicas"),
  fechaRegistro: timestamp("fecha_registro", { withTimezone: true }).notNull().defaultNow(),
});

export type Estudiante = typeof estudiantesTable.$inferSelect;
export type InsertEstudiante = typeof estudiantesTable.$inferInsert;
