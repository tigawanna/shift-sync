import { impersonateUser } from "@/data-access-layer/auth/impersonation.functions";
import { viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { getHomePathForRole } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

type ImpersonateUserButtonProps = {
  user: Pick<typeof userTable.$inferSelect, "id" | "name" | "banned">;
};

export function ImpersonateUserButton({ user }: ImpersonateUserButtonProps) {
  const qc = useQueryClient();
  const router = useRouter();

  const impersonateMutation = useMutation({
    mutationFn: () => impersonateUser({ data: { userId: user.id } }),
    onSuccess: async (result) => {
      await qc.invalidateQueries(viewerqueryOptions);
      await router.invalidate();
      toast.success(`Signed in as ${user.name}`);
      await router.navigate({ to: getHomePathForRole(result.role) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not impersonate user.");
    },
  });

  if (user.banned) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs gap-1"
      disabled={impersonateMutation.isPending}
      onClick={() => impersonateMutation.mutate()}
      title={`Sign in as ${user.name}`}
    >
      <LogIn className="size-3.5" />
      {impersonateMutation.isPending ? "Signing in…" : "Sign in as"}
    </button>
  );
}
