import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

export const viewerMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { getAuth } = await import("@/lib/auth");
  const session = await (await getAuth()).api.getSession({ headers: request.headers });
  if (!session) {
    const returnTo = new URL(request.url).pathname;
    throw redirect({ to: "/auth", search: { returnTo } });
  }
  return await next({
    context: {
      viewer: { user: session.user, session: session.session },
    },
  });
});
