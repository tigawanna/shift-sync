import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql/node";
import * as schema from "@/lib/drizzle/schema";

/** Local `file:` SQLite via the native libSQL driver. */
export function createLocalDb(url: string, authToken?: string) {
  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}
