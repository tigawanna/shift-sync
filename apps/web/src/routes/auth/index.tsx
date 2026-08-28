import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppConfig } from "@/utils/system";
import { SigninComponent } from "./-components/SigninComponent";

const searchparams = z.object({
  returnTo: z.string().default("/manager"),
});

export const Route = createFileRoute("/auth/")({
  component: SigninPage,
  validateSearch: (search) => searchparams.parse(search),
  beforeLoad: ({ context, search }) => {
    const user = context.viewer?.user;
    if (!user) return;
    throw redirect({ to: search.returnTo || "/manager" });
  },
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Sign in` }],
  }),
});

function SigninPage() {
  return <SigninComponent />;
}
