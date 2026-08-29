import { getSession } from "@/data-access-layer/auth/auth.functions";
import { authClient, type BetterAuthSession } from "@/lib/better-auth/client";
import {
  ROLE,
  type AppRole,
  getUserAppRole,
  hasAppRole,
  isAdminRole,
  isManagerRole,
  isStaffRole,
} from "@/lib/better-auth/roles";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { redirect, useRouter } from "@tanstack/react-router";

type ViewerUser = BetterAuthSession["user"];
type ViewerSession = BetterAuthSession["session"];

export type TViewer = {
  user?: ViewerUser;
  session?: ViewerSession;
};

export type TViewerLoginPayload = { email: string; password: string };

export { ROLE, type AppRole, getUserAppRole } from "@/lib/better-auth/roles";

export function isAdminUser(user: ViewerUser | undefined): boolean {
  return isAdminRole(getUserAppRole(user));
}

export function isManagerUser(user: ViewerUser | undefined): boolean {
  return isManagerRole(getUserAppRole(user));
}

export function isStaffUser(user: ViewerUser | undefined): boolean {
  return isStaffRole(getUserAppRole(user));
}

export function requireAppRole(user: ViewerUser | undefined, allowed: readonly AppRole[]): AppRole {
  const role = getUserAppRole(user);
  if (!hasAppRole(role, allowed)) {
    throw redirect({ to: "/auth", search: { returnTo: "/" } });
  }
  return role;
}

export const viewerqueryOptions = queryOptions({
  queryKey: ["viewer"],
  queryFn: async () => {
    const session = await getSession();
    if (!session) {
      return { data: null, error: null };
    }
    return {
      data: { user: session.user, session: session.session },
      error: null,
    };
  },
});

export function useViewer() {
  const qc = useQueryClient();
  const router = useRouter();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      void qc.invalidateQueries(viewerqueryOptions);
      await router.invalidate();
      throw redirect({ to: "/auth", search: { returnTo: "/" } });
    },
  });
  const viewerQuery = useSuspenseQuery(viewerqueryOptions);

  return {
    viewerQuery,
    viewer: {
      user: viewerQuery.data.data?.user,
      session: viewerQuery.data.data?.session,
    },
    logoutMutation,
  } as const;
}
