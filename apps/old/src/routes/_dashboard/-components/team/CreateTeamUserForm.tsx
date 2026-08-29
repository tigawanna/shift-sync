import { PasswordInput } from "@/components/ui/password-input";
import { createTeamUser } from "@/data-access-layer/team/team.functions";
import type { TeamMemberRole } from "@/data-access-layer/team/team.types";
import { ROLE } from "@/lib/better-auth/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createTeamUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type CreateTeamUserValues = z.infer<typeof createTeamUserSchema>;

type CreateTeamUserFormProps = {
  role: TeamMemberRole;
  onCancel: () => void;
  onCreated: () => void;
};

export function CreateTeamUserForm({ role, onCancel, onCreated }: CreateTeamUserFormProps) {
  const roleLabel = role === ROLE.manager ? "manager" : "staff member";

  const form = useForm<CreateTeamUserValues>({
    resolver: zodResolver(createTeamUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateTeamUserValues) =>
      createTeamUser({
        data: {
          name: values.name,
          email: values.email,
          password: values.password,
          role,
        },
      }),
    onSuccess: (member) => {
      toast.success(`${roleLabel} created`, {
        description: `${member.name} can sign in with ${member.email}.`,
      });
      form.reset();
      onCreated();
    },
    onError: (error: unknown) => {
      toast.error("Could not create user", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="border-base-content/10 bg-base-100/70 flex flex-col gap-4 rounded-2xl border p-6"
    >
      <div>
        <p className="text-base-content/60 font-mono text-xs tracking-wide uppercase">
          New {roleLabel}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Create account</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          They can sign in immediately with the email and password you set.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span>Name</span>
        <input type="text" className="input-bordered input w-full" {...form.register("name")} />
        {form.formState.errors.name ? (
          <span className="text-flag-red text-xs">{form.formState.errors.name.message}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Email</span>
        <input
          type="email"
          className="input-bordered input w-full"
          autoComplete="off"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <span className="text-flag-red text-xs">{form.formState.errors.email.message}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Password</span>
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <span className="text-flag-red text-xs">{form.formState.errors.password.message}</span>
        ) : null}
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : `Create ${roleLabel}`}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
