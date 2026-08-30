import { defineConfig } from "drizzle-kit";
import { DEFAULT_DATABASE_URL, isTursoRemote } from "./src/lib/drizzle/turso";

const databaseUrl = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
const remote = isTursoRemote(databaseUrl);

/**
 * Turso Cloud → dialect `turso` + auth token.
 * Local `file:` → dialect `sqlite`.
 */
export default defineConfig({
  schema: "./src/lib/drizzle/schema",
  out: "./drizzle",
  dialect: remote ? "turso" : "sqlite",
  dbCredentials: remote
    ? {
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN ?? "",
      }
    : {
        url: databaseUrl,
      },
});
