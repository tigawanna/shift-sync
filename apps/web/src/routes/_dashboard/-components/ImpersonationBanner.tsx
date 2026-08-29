import { stopImpersonating } from "@/data-access-layer/auth/impersonation.functions";
import { viewerqueryOptions, useViewer } from "@/data-access-layer/auth/viewer";
import { getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export function ImpersonationBanner() {
  const { viewer } = useViewer();
  const qc = useQueryClient();
  const router = useRouter();
  const stopMutation = useMutation({
    mutationFn: async () => stopImpersonating(),
    onSuccess: async () => {
      await qc.invalidateQueries(viewerqueryOptions);
      await router.invalidate();
      const fresh = await qc.fetchQuery(viewerqueryOptions);
      const role = getUserAppRole(fresh.data?.user);
      await router.navigate({ to: getHomePathForRole(role) });
    },
  });

  const impersonatedBy = viewer.session?.impersonatedBy;
  if (!impersonatedBy || !viewer.user) {
    return null;
  }

  return (
    <div className="bg-warning/15 border-warning/30 text-warning-content flex items-center justify-between gap-4 border-b px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-warning size-4 shrink-0" />
        <span>
          Viewing as <strong>{viewer.user.name}</strong> ({viewer.user.email})
        </span>
      </div>
      <button
        type="button"
        className="btn btn-warning btn-xs"
        disabled={stopMutation.isPending}
        onClick={() => stopMutation.mutate()}
      >
        {stopMutation.isPending ? "Returning…" : "Stop impersonating"}
      </button>
    </div>
  );
}
