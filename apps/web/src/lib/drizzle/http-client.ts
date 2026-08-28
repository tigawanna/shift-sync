import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/lib/drizzle/schema";

/** Remote Turso via HTTP — no native libsql bindings. */
export function createRemoteDb(url: string, authToken: string) {
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}
