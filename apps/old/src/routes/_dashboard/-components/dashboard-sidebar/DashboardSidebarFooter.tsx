import { useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebarUser } from "./DashboardSidebarUser";
import { DashboardTheme } from "./DashboardTheme";

export function DashboardSidebarFooter() {
  const { state, isMobile } = useSidebar();
  const showLabel = state === "expanded" || isMobile;

  return (
    <>
      {showLabel ? <p className="text-base-content/60 px-2 text-xs">Your account</p> : null}
      <DashboardTheme />
      <DashboardSidebarUser />
    </>
  );
}
