import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/server/routes";

// Load environment configurations
dotenv.config();

const app = express();
const PORT = 3000;

// Parsers for application/json payloads with generous payload size limits
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Expose API routes first
app.use("/api/v1", apiRouter);

// Set up server-side health checks
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development Express server with hot Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite asset delivery and hot-reload hooks
    app.use(vite.middlewares);
  } else {
    console.log("Booting Express in static production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Placement gateway live at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("Express startup crashed:", err);
});
