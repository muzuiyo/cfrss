import { Hono } from "hono";
import type { AppContext } from "../types";
import { successResponse, errorResponse, ErrorCodes } from "../utils/response";
import { importOpml, exportOpml } from "../services/opml";

const opmlRouter = new Hono<AppContext>();

// POST /api/opml/import - Import OPML file
opmlRouter.post("/import", async (c) => {
  const db = c.get("db");

  try {
    // Get the uploaded file
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse(c, ErrorCodes.INVALID_REQUEST, "No file provided", 400);
    }

    // Validate file type
    if (!file.name.endsWith(".opml") && !file.name.endsWith(".xml")) {
      return errorResponse(
        c,
        ErrorCodes.INVALID_REQUEST,
        "Invalid file type. Please upload an OPML or XML file.",
        400
      );
    }

    // Read file content
    const xml = await file.text();

    // Import feeds
    const result = await importOpml(db, xml);

    return successResponse(c, {
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import OPML";
    return errorResponse(c, ErrorCodes.OPML_PARSE_ERROR, message, 400);
  }
});

// GET /api/opml/export - Export feeds as OPML
opmlRouter.get("/export", async (c) => {
  const db = c.get("db");

  try {
    const xml = await exportOpml(db);

    // Return XML with proper headers
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": 'attachment; filename="rss-reader-export.opml"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export OPML";
    return errorResponse(c, ErrorCodes.INTERNAL_ERROR, message, 500);
  }
});

export default opmlRouter;
