import { boolean, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const rolAdminEnum = pgEnum("rol_admin", [
  "SUPER_ADMIN",
  "RECTOR",
  "SECRETARIA",
  "CONTABILIDAD",
]);

export const usuariosAdminTable = pgTable("usuarios_admin", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: rolAdminEnum("rol").notNull().default("SECRETARIA"),
  activo: boolean("activo").notNull().default(true),
  fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
});

export type UsuarioAdmin = typeof usuariosAdminTable.$inferSelect;
export type InsertUsuarioAdmin = typeof usuariosAdminTable.$inferInsert;
