import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "path";
import dotenv from "dotenv";

const LOCAL_DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/janus_intake";

const envCandidates = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", "..", "artifacts", "api-server", ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "artifacts", "api-server", ".env"),
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

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
