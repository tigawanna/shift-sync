import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRemoteDb } from "@/lib/drizzle/http-client";
import { createLocalDb } from "@/lib/drizzle/local-client";
import {
  APP_ROOT,
  DEFAULT_DATABASE_URL,
  isTursoRemote,
  resolveDatabaseUrl,
} from "@/lib/drizzle/turso";

type AppDatabase = ReturnType<typeof createLocalDb> | ReturnType<typeof createRemoteDb>;

export type { AppDatabase };

const MIGRATIONS_DIR = path.join(APP_ROOT, "drizzle");

let db: AppDatabase | null = null;
let initPromise: Promise<AppDatabase> | null = null;

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

function openDb(): AppDatabase {
  const url = databaseUrl();
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

  if (isTursoRemote(url)) {
    if (!authToken) {
      throw new Error("DATABASE_AUTH_TOKEN is required for Turso");
    }
    return createRemoteDb(url, authToken);
  }

  const resolved = resolveDatabaseUrl(url);
  if (resolved.startsWith("file:")) {
    const dir = path.dirname(resolved.slice("file:".length));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  return createLocalDb(resolved, authToken);
}

async function initialize(): Promise<AppDatabase> {
  const database = openDb();

  // Remote schema is applied with `pnpm db:migrate` / `pnpm db:push`.
  if (!isTursoRemote(databaseUrl())) {
    await migrate(database, { migrationsFolder: MIGRATIONS_DIR });
  }

  db = database;
  return database;
}

/** Lazy singleton: HTTP Turso vs native local `file:`. */
export async function getDb(): Promise<AppDatabase> {
  if (db) {
    return db;
  }

  initPromise ??= initialize();
  return initPromise;
}
