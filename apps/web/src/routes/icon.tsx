import { SiteIcon } from "@/components/icon/SiteIcon";
import { MainLoader } from "@/components/wrappers/MainLoader";
import { PendingState } from "@/components/wrappers/PendingState";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/icon")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen w-full flex-col gap-10">
      <div className="flex w-full items-center justify-center">
        <AppConfig.icon size={100} />
        <SiteIcon size={300} animate />
        <SiteIcon size={500} animate />
      </div>
      <div className="flex w-full items-center">
        <MainLoader className="w-full" />
      </div>
      <div className="flex w-full items-center">
        <PendingState />
      </div>
    </div>
  );
}
