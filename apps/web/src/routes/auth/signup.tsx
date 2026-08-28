import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppConfig } from "@/utils/system";
import { SignupComponent } from "./-components/SignupComponent";

const searchparams = z.object({
  returnTo: z.string().default("/manager"),
});

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
  validateSearch: (search) => searchparams.parse(search),
  beforeLoad: ({ context, search }) => {
    const user = context.viewer?.user;
    if (!user) return;
    throw redirect({ to: search.returnTo || "/manager" });
  },
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Sign up` }],
  }),
});

function SignupPage() {
  return <SignupComponent />;
}
