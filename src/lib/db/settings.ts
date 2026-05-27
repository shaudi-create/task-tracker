import { sql } from "@/lib/db/client";
import { mapSettingsRow } from "@/lib/db/mappers";
import {
  Settings,
  UpdateSettingsBody,
  type Settings as SettingsType,
} from "@/lib/schemas/settings";
import type { z } from "zod";

export async function getSettings(): Promise<SettingsType> {
  const rows = await sql`SELECT * FROM settings WHERE id = 1`;
  if (rows.length === 0) {
    throw new Error("Settings row missing");
  }
  return Settings.parse(mapSettingsRow(rows[0] as Record<string, unknown>));
}

export async function updateSettings(
  patch: z.infer<typeof UpdateSettingsBody>,
): Promise<SettingsType> {
  const current = await getSettings();

  const dailyCeiling =
    patch.daily_ceiling_minutes ?? current.daily_ceiling_minutes;
  const githubRepo =
    patch.github_repo !== undefined ? patch.github_repo : current.github_repo;

  const rows = await sql`
    UPDATE settings
    SET
      daily_ceiling_minutes = ${dailyCeiling},
      github_repo = ${githubRepo},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;

  return Settings.parse(mapSettingsRow(rows[0] as Record<string, unknown>));
}
