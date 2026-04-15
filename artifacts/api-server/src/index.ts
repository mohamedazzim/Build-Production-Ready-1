import path from "node:path";
import dotenv from "dotenv";
import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

dotenv.config({ path: path.resolve(import.meta.dirname, "..", ".env"), override: false });
dotenv.config({ override: false });

const rawPort = process.env["PORT"] ?? "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  try {
    await pool.query("select 1");
  } catch (err) {
    logger.error(
      { err },
      "Database connection failed. Check DATABASE_URL/LOCAL_DATABASE_URL in artifacts/api-server/.env",
    );
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void startServer();
