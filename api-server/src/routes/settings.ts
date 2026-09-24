import { Router, type IRouter, type Request, type Response } from "express";
import { GetSettingsResponse, UpdateSettingsBody } from "../schemas/api";
import { getSettings, updateSettings } from "../lib/settings";
import { requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

/** Public: the public site and the admin console read the institution data. */
router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json(GetSettingsResponse.parse(settings));
});

async function saveSettings(req: Request, res: Response): Promise<void> {
  const parsed = UpdateSettingsBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "Revisa los datos de configuración.",
      detalles: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const settings = await updateSettings(parsed.data, (req as AuthenticatedRequest).admin?.correo);
    res.json(GetSettingsResponse.parse(settings));
  } catch (error) {
    req.log?.error({ err: error }, "No fue posible guardar la configuración de la institución");
    res.status(500).json({ error: "No fue posible guardar la configuración. Inténtalo de nuevo." });
  }
}

/** Admin: saves the institution configuration (POST keeps the contract used by the panel). */
router.post("/settings", requireAdmin, saveSettings);
router.put("/settings", requireAdmin, saveSettings);

export default router;

