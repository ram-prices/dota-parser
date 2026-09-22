import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { initSchema } from "./db/client.js";
import { router } from "./routes.js";
import { startPoller } from "./poller.js";

async function main() {
  await initSchema();

  const app = express();
  app.use(cors());
  app.use("/api", router);
  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  app.listen(config.port, () => {
    console.log(`[server] listening on :${config.port}`);
  });

  startPoller();
}

main().catch((err) => {
  console.error("fatal startup error:", err);
  process.exit(1);
});
