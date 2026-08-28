import { impersonateUser } from "@/data-access-layer/auth/impersonation.functions";
import { viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import type { TeamMember } from "@/data-access-layer/team/team.types";
import { ROLE } from "@/lib/better-auth/roles";
import { getHomePathForRole } from "@/lib/better-auth/roles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

type ImpersonateUserButtonProps = {
  member: TeamMember;
  viewerRole: typeof ROLE.admin | typeof ROLE.manager;
};

export function ImpersonateUserButton({ member, viewerRole }: ImpersonateUserButtonProps) {
  const qc = useQueryClient();
  const router = useRouter();

  const canImpersonate =
    member.role === ROLE.staff || (viewerRole === ROLE.admin && member.role === ROLE.manager);

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      return impersonateUser({ data: { userId: member.id } });
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries(viewerqueryOptions);
      await router.invalidate();
      toast.success(`Signed in as ${member.name}`);
      await router.navigate({ to: getHomePathForRole(result.role) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not impersonate user.");
    },
  });

  if (!canImpersonate || member.banned) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs gap-1"
      disabled={impersonateMutation.isPending}
      onClick={() => impersonateMutation.mutate()}
      title={`Sign in as ${member.name}`}
    >
      <LogIn className="size-3.5" />
      {impersonateMutation.isPending ? "Signing in…" : "Sign in as"}
    </button>
  );
}
