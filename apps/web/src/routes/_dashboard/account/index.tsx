import { deleteMyAccount } from "@/data-access-layer/auth/account.functions";
import { isAdminUser, useViewer } from "@/data-access-layer/auth/viewer";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { authClient } from "@/lib/better-auth/client";
import { formatDate } from "@/utils/date";
import { AppConfig } from "@/utils/system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/account/")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Account` }],
  }),
});

function AccountPage() {
  const { viewer } = useViewer();
  const user = viewer.user;
  const qc = useQueryClient();
  const router = useRouter();

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteMyAccount(),
    onSuccess: async () => {
      toast.success("Account deleted");
      try {
        await authClient.signOut();
      } catch {
        // Session may already be gone after server-side deletion.
      }
      await qc.resetQueries({ queryKey: ["viewer"] });
      await router.invalidate();
      void router.navigate({ to: "/" });
    },
    onError: (error) => {
      toast.error("Could not delete account", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  if (!user) {
    return null;
  }

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-base-content/70 mt-2 max-w-2xl">
          Your profile and account settings.
        </p>
      </div>

      <div className="border-base-content/10 bg-base-100/70 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-base-content/60 font-mono text-xs tracking-wide uppercase">
              Profile
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{user.name}</h2>
            <p className="text-base-content/70 mt-1 text-sm">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdminUser(user) ? (
              <span className="bg-flag-green-solid text-flag-green-content rounded-md px-2.5 py-1 text-xs font-medium">
                Admin
              </span>
            ) : (
              <span className="bg-base-content/8 text-base-content/70 rounded-md px-2.5 py-1 text-xs font-medium">
                Member
              </span>
            )}
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-base-content/60 text-xs">Member since</dt>
            <dd className="mt-1 text-sm">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-base-content/60 text-xs">Email</dt>
            <dd className="mt-1 text-sm">{user.email}</dd>
          </div>
        </dl>
      </div>

      <div className="border-base-content/10 bg-base-100/70 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-base-content/60 font-mono text-xs tracking-wide uppercase">
              Data & privacy
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">Delete account</h2>
            <p className="text-base-content/70 mt-4 max-w-xl text-sm">
              Permanently removes your profile, sessions, and sign-in credentials.
            </p>
          </div>
          <ConfirmAction
            title="Delete account"
            description={`Permanently delete the account for ${user.email}? This cannot be undone.`}
            confirmLabel="Delete account"
            disabled={deleteAccountMutation.isPending}
            onConfirm={() => deleteAccountMutation.mutate()}
          >
            <button
              type="button"
              className="btn border-flag-red/45 btn-outline btn-sm hover:bg-flag-red-soft"
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
            </button>
          </ConfirmAction>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/privacy" className="btn btn-ghost btn-sm">
            Privacy
          </Link>
          <Link to="/terms" className="btn btn-ghost btn-sm">
            Terms
          </Link>
        </div>
      </div>
    </section>
  );
}
