import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppContext } from "../types";
import { settings } from "../db/schema";
import { successResponse, errorResponse, ErrorCodes } from "../utils/response";
import { updateSettingsSchema } from "../utils/validation";

const settingsRouter = new Hono<AppContext>();

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  refresh_interval: "30",  // minutes
  ui_theme: "system",
  ui_articles_per_page: "20",
};

// GET /api/settings - Get all settings
settingsRouter.get("/", async (c) => {
  const db = c.get("db");

  const allSettings = await db.query.settings.findMany();

  // Convert to key-value object
  const settingsObj: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const setting of allSettings) {
    settingsObj[setting.key] = setting.value;
  }

  return successResponse(c, settingsObj);
});

// PUT /api/settings - Update settings
settingsRouter.put("/", zValidator("json", updateSettingsSchema), async (c) => {
  const db = c.get("db");
  const input = c.req.valid("json");

  // Validate refresh_interval
  if (input.refresh_interval) {
    const interval = parseInt(input.refresh_interval, 10);
    if (isNaN(interval) || interval < 5) {
      return errorResponse(
        c,
        ErrorCodes.INVALID_REQUEST,
        "Refresh interval must be at least 5 minutes",
        400
      );
    }
  }

  // Validate ui_articles_per_page
  if (input.ui_articles_per_page) {
    const perPage = parseInt(input.ui_articles_per_page, 10);
    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return errorResponse(
        c,
        ErrorCodes.INVALID_REQUEST,
        "Articles per page must be between 1 and 100",
        400
      );
    }
  }

  // Update each setting
  for (const [key, value] of Object.entries(input)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value },
      });
  }

  // Return updated settings
  const allSettings = await db.query.settings.findMany();
  const settingsObj: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const setting of allSettings) {
    settingsObj[setting.key] = setting.value;
  }

  return successResponse(c, settingsObj);
});

export default settingsRouter;
