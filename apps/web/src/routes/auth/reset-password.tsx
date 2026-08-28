import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/better-auth/client";
import { AppConfig } from "@/utils/system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const searchparams = z.object({
  token: z.string().optional(),
  returnTo: z.string().default("/manager"),
});

const resetSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search) => searchparams.parse(search),
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Reset password` }],
  }),
});

function ResetPasswordPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const token = useMemo(() => search.token ?? "", [search.token]);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: async (payload: ResetValues) => {
      if (!token) {
        throw new Error("Missing reset token. Open the link from your email again.");
      }
      const { error } = await authClient.resetPassword({
        newPassword: payload.password,
        token,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated");
      void router.navigate({ to: "/auth", search: { returnTo: search.returnTo } });
    },
    onError: (error: unknown) => {
      toast.error("Could not reset password", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="border-base-300 bg-base-100/90 flex w-full max-w-md flex-col gap-4 rounded-2xl border p-8 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <AppConfig.icon className="size-8" />
          <div>
            <h1 className="text-2xl font-semibold">Choose a new password</h1>
            <p className="text-base-content/60 text-sm">Then sign in with it</p>
          </div>
        </div>

        {!token ? (
          <p className="text-error text-sm">
            This page needs a valid reset link. Request a new one from forgot password.
          </p>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          <span>New password</span>
          <PasswordInput autoComplete="new-password" {...form.register("password")} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Confirm password</span>
          <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
          {form.formState.errors.confirmPassword ? (
            <span className="text-error text-xs">
              {form.formState.errors.confirmPassword.message}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={mutation.isPending || !token}
        >
          {mutation.isPending ? "Updating…" : "Update password"}
        </button>

        <p className="text-base-content/70 text-center text-sm">
          <Link
            to="/auth/forgot-password"
            search={{ returnTo: search.returnTo }}
            className="link link-primary"
          >
            Request another link
          </Link>
          {" · "}
          <Link to="/auth" search={{ returnTo: search.returnTo }} className="link link-primary">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
