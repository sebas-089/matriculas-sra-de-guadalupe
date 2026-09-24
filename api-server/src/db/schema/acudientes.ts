import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const acudientesTable = pgTable("acudientes", {
  id: serial("id").primaryKey(),
  nombreCompleto: text("nombre_completo").notNull(),
  tipoDocumento: text("tipo_documento").notNull(),
  documentoIdentidad: text("documento_identidad").notNull().unique(),
  /** Relación con el estudiante: Madre, Padre, Acudiente, Abuelo(a), Tío(a), Otro. */
  parentesco: text("parentesco"),
  correo: text("correo").notNull(),
  telefono: text("telefono").notNull(),
  direccion: text("direccion"),
  ocupacion: text("ocupacion"),
  fechaRegistro: timestamp("fecha_registro", { withTimezone: true }).notNull().defaultNow(),
});

export type Acudiente = typeof acudientesTable.$inferSelect;
export type InsertAcudiente = typeof acudientesTable.$inferInsert;
