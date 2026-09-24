import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row table (id = 1) that stores every customizable value of the
 * institution: branding (logo / background / primary color) and the
 * institutional contact information shown on the public site and the
 * admin console.
 */
export const systemSettingsTable = pgTable("system_settings", {
  id: integer("id").primaryKey().default(1),
  schoolName: text("school_name").notNull().default("Centro Educativo Nuestra Señora de Guadalupe"),
  logoUrl: text("logo_url"),
  backgroundUrl: text("background_url"),
  primaryColor: text("primary_color").notNull().default("#1f4e79"),
  address: text("address").notNull().default("Calle 12 # 4-56, Barrio Centro, Popayán, Cauca"),
  phone: text("phone").notNull().default("+57 313 245 8907"),
  whatsapp: text("whatsapp").notNull().default("573132458907"),
  email: text("email").notNull().default("admisiones@guadalupe.edu.co"),
  adminPasswordHash: text("admin_password_hash"),
  welcomeText: text("welcome_text")
    .notNull()
    .default(
      "Completa la matrícula de tu hijo o hija en pocos minutos. Un proceso claro, acompañado y seguro.",
    ),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export type SystemSettingsRow = typeof systemSettingsTable.$inferSelect;
export type InsertSystemSettings = typeof systemSettingsTable.$inferInsert;

/** Identifier of the single configuration row. */
export const SYSTEM_SETTINGS_ID = 1;

/** Fallback values used when the table is empty or unreachable. */
export const DEFAULT_SETTINGS = {
  school_name: "Centro Educativo Nuestra Señora de Guadalupe",
  logo_url: "",
  background_url: "",
  primary_color: "#1f4e79",
  address: "Calle 12 # 4-56, Barrio Centro, Popayán, Cauca",
  phone: "+57 313 245 8907",
  whatsapp: "573132458907",
  email: "admisiones@guadalupe.edu.co",
  welcome_text:
    "Completa la matrícula de tu hijo o hija en pocos minutos. Un proceso claro, acompañado y seguro.",
} as const;

export type SystemSettings = {
  school_name: string;
  logo_url: string;
  background_url: string;
  primary_color: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  welcome_text: string;
};
