import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { honoApp } from "@/server/api-routes";

type RequestContext = {
  isServer: true;
};

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: RequestContext;
    };
  }
}

function isHonoApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api") && !pathname.startsWith("/api/auth");
}

export default createServerEntry({
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (isHonoApiRoute(pathname)) {
      return honoApp.fetch(request);
    }

    return handler.fetch(request, { context: { isServer: true } });
  },
});
