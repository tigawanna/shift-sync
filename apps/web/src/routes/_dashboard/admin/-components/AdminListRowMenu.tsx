import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { impersonateUser } from "@/data-access-layer/auth/impersonation.functions";
import { viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { getHomePathForRole } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { EllipsisVertical } from "lucide-react";
import { toast } from "sonner";

type AdminListRowMenuProps = {
  label: string;
  actions: { label: string; onSelect: () => void }[];
  impersonate?: Pick<typeof userTable.$inferSelect, "id" | "name" | "banned">;
};

export function AdminListRowMenu({ label, actions, impersonate }: AdminListRowMenuProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const impersonateMutation = useMutation({
    mutationFn: () => {
      if (!impersonate) throw new Error("No user to impersonate.");
      return impersonateUser({ data: { userId: impersonate.id } });
    },
    onSuccess: async (result) => {
      if (!impersonate) return;
      await qc.invalidateQueries(viewerqueryOptions);
      await router.invalidate();
      toast.success(`Signed in as ${impersonate.name}`);
      await router.navigate({ to: getHomePathForRole(result.role) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not impersonate user.");
    },
  });

  const canImpersonate = Boolean(impersonate && !impersonate.banned);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs"
            aria-label={label}
            data-test="admin-row-menu"
          />
        }
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} onClick={action.onSelect}>
            {action.label}
          </DropdownMenuItem>
        ))}
        {canImpersonate ? (
          <DropdownMenuItem
            disabled={impersonateMutation.isPending}
            onClick={() => impersonateMutation.mutate()}
          >
            {impersonateMutation.isPending ? "Signing in…" : "Sign in as"}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
