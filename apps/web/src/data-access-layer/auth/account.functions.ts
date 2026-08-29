import { getAuth } from "@/lib/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

/** Deletes the signed-in user's Better Auth account. */
export const deleteMyAccount = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getRequestHeaders();
  await (await getAuth()).api.deleteUser({ headers, body: {} });
});
