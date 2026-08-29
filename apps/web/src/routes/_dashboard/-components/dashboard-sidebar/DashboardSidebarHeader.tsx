import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function DashboardSidebarHeader() {
  const { state, setOpenMobile, isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={<Link to="/" className="hover:bg-primary/10 flex w-full justify-center" />}
          onClick={() => setOpenMobile(false)}
        >
            {/*
              SidebarMenuButton forces [&>svg]:size-4 on direct SVG children.
              Wrap like the shadcn Avatar/team-switcher pattern so size sticks.
            */}
            <span className="flex aspect-square size-5 items-center justify-center rounded-lg">
              <AppConfig.icon className="text-sidebar-foreground size-5" />
            </span>
            {state === "expanded" || isMobile ? (
              <span className="font-serif text-xl tracking-tight">
                {AppConfig.name}
                <span className="text-primary">.</span>
              </span>
            ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
