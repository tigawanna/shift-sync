import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut } from "lucide-react";

export function DashboardSidebarUser() {
  const { isMobile, state } = useSidebar();
  const isExpanded = state === "expanded" || isMobile;
  const { viewer, logoutMutation } = useViewer();
  const navigate = useNavigate();

  if (!viewer.user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
              <Avatar className="size-6 shrink-0 rounded-lg">
                <AvatarImage src={viewer.user.image ?? undefined} alt={viewer.user.name} />
                <AvatarFallback className="rounded-lg">
                  {viewer.user.name?.slice(0, 2) ?? "KT"}
                </AvatarFallback>
              </Avatar>
              {isExpanded ? (
                <>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{viewer.user.name}</span>
                    <span className="truncate text-xs">{viewer.user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </>
              ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="border-base-content/10 bg-base-100 text-base-content min-w-56 rounded-lg border shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={viewer.user.image ?? undefined} alt={viewer.user.name} />
                  <AvatarFallback className="rounded-lg">
                    {viewer.user.name?.slice(0, 2) ?? "KT"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{viewer.user.name}</span>
                  <span className="text-base-content/60 truncate text-xs">{viewer.user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/privacy" />}>Privacy</DropdownMenuItem>
            <DropdownMenuItem render={<Link to="/terms" />}>Terms</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                logoutMutation.mutate();
                void navigate({ to: "/auth", search: { returnTo: "/" } });
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
