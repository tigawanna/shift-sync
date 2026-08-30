import { PasswordInput } from "@/components/ui/password-input";
import { viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { authClient, authClientErrorMessage } from "@/lib/better-auth/client";
import { getUserAppRole, resolveDashboardPath } from "@/lib/better-auth/roles";
import { AppConfig } from "@/utils/system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Route } from "../signup";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

type SignupValues = z.infer<typeof signupSchema>;

export function SignupComponent() {
  const qc = useQueryClient();
  const router = useRouter();
  const { returnTo } = Route.useSearch();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: SignupValues) => {
      const { data, error } = await authClient.signUp.email({
        name: payload.name,
        email: payload.email,
        password: payload.password,
      });
      if (error) throw error;
      return data;
    },
    onError: (error: unknown) => {
      toast.error("Sign up failed", {
        description: authClientErrorMessage(error),
      });
    },
    onSuccess: async () => {
      toast.success("Account created");
      await router.invalidate();
      const viewer = await qc.fetchQuery(viewerqueryOptions);
      const role = getUserAppRole(viewer.data?.user);
      void router.navigate({ to: resolveDashboardPath(returnTo, role) });
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
            <h1 className="text-2xl font-semibold">Create account</h1>
            <p className="text-base-content/60 text-sm">{AppConfig.name}</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>Name</span>
          <input type="text" className="input-bordered input w-full" {...form.register("name")} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            className="input-bordered input w-full"
            autoComplete="username"
            {...form.register("email")}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Password</span>
          <PasswordInput autoComplete="new-password" {...form.register("password")} />
        </label>

        <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-base-content/70 text-center text-sm">
          Already have an account?{" "}
          <Link to="/auth" search={{ returnTo: returnTo ?? "" }} className="link link-primary">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
