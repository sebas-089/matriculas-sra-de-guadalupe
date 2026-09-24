import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  DEFAULT_SETTINGS,
  SYSTEM_SETTINGS_ID,
  systemSettingsTable,
  type SystemSettings,
} from "../db/schema";
import type { UpdateSettingsInput } from "../schemas/api";
import { logger } from "./logger";

/** Maps the snake_case API contract to the camelCase Drizzle columns. */
const COLUMN_BY_FIELD = {
  school_name: "schoolName",
  logo_url: "logoUrl",
  background_url: "backgroundUrl",
  primary_color: "primaryColor",
  address: "address",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  welcome_text: "welcomeText",
} as const satisfies Record<keyof SystemSettings, keyof typeof systemSettingsTable.$inferInsert>;

function toSettings(row: typeof systemSettingsTable.$inferSelect): SystemSettings {
  return {
    school_name: row.schoolName,
    logo_url: row.logoUrl ?? "",
    background_url: row.backgroundUrl ?? "",
    primary_color: row.primaryColor,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    welcome_text: row.welcomeText,
  };
}

/**
 * Reads the single configuration row. If the row (or the table) does not exist
 * yet, the default institutional values are returned so that the public site
 * always renders, even before `npm run db:push` has been executed.
 */
export async function getSettings(): Promise<SystemSettings> {
  try {
    const [row] = await db
      .select()
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.id, SYSTEM_SETTINGS_ID))
      .limit(1);

    return row ? toSettings(row) : { ...DEFAULT_SETTINGS };
  } catch (error) {
    logger.error(
      { err: error },
      "No se pudo leer la tabla system_settings. Se usan los valores predeterminados (¿ejecutaste npm run db:push?).",
    );
    return { ...DEFAULT_SETTINGS };
  }
}

/** Creates or updates the single configuration row (id = 1). */
export async function updateSettings(
  input: UpdateSettingsInput,
  updatedBy?: string,
): Promise<SystemSettings> {
  const now = new Date();
  const values: Record<string, unknown> = { id: SYSTEM_SETTINGS_ID, updatedAt: now, updatedBy: updatedBy ?? null };

  for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
    const value = input[field as keyof UpdateSettingsInput];
    if (value !== undefined) values[column] = value;
  }

  const updateValues = { ...values };
  delete updateValues.id;

  const [row] = await db
    .insert(systemSettingsTable)
    .values(values as typeof systemSettingsTable.$inferInsert)
    .onConflictDoUpdate({ target: systemSettingsTable.id, set: updateValues })
    .returning();

  if (!row) {
    throw new Error("No fue posible guardar la configuración de la institución.");
  }

  return toSettings(row);
}
