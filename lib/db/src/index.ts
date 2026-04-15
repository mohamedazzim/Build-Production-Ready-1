import { drizzle } from "drizzle-orm/node-postgres";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const LOCAL_DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/janus_intake";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "artifacts", "api-server", ".env"),
  path.resolve(import.meta.dirname, "..", ".env"),
  path.resolve(import.meta.dirname, "..", "..", "..", "artifacts", "api-server", ".env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const databaseUrl =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  LOCAL_DEFAULT_DATABASE_URL;

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
