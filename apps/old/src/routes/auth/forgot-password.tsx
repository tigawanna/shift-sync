import { AppConfig } from "@/utils/system";
import { authClient } from "@/lib/better-auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const searchparams = z.object({
  returnTo: z.string().default("/manager"),
});

const forgotSchema = z.object({
  email: z.email(),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
  validateSearch: (search) => searchparams.parse(search),
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Forgot password` }],
  }),
});

function ForgotPasswordPage() {
  const { returnTo } = Route.useSearch();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (payload: ForgotValues) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await authClient.requestPasswordReset({
        email: payload.email,
        redirectTo: `${origin}/auth/reset-password`,
      });
      if (error) throw error;
      return payload.email;
    },
    onSuccess: (email) => {
      setSentTo(email);
      toast.success("Reset email sent");
    },
    onError: (error: unknown) => {
      toast.error("Could not send reset email", {
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
            <h1 className="text-2xl font-semibold">Forgot password</h1>
            <p className="text-base-content/60 text-sm">We'll email you a reset link</p>
          </div>
        </div>

        {sentTo ? (
          <p className="text-base-content/70 text-sm">
            If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is
            on the way. You can close this tab after you open the email.
          </p>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              className="input-bordered input w-full"
              autoComplete="username"
              {...form.register("email")}
            />
          </label>
        )}

        {!sentTo ? (
          <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send reset link"}
          </button>
        ) : null}

        <p className="text-base-content/70 text-center text-sm">
          <Link to="/auth" search={{ returnTo }} className="link link-primary">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
