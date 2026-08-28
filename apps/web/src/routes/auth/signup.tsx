import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppConfig } from "@/utils/system";
import { getUserAppRole, resolveDashboardPath } from "@/lib/better-auth/roles";
import { SignupComponent } from "./-components/SignupComponent";

const searchparams = z.object({
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
  validateSearch: (search) => searchparams.parse(search),
  beforeLoad: ({ context, search }) => {
    const user = context.viewer?.user;
    if (!user) return;
    const role = getUserAppRole(user);
    throw redirect({ to: resolveDashboardPath(search.returnTo, role) });
  },
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Sign up` }],
  }),
});

function SignupPage() {
  return <SignupComponent />;
}
