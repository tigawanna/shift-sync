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
import { viewerqueryOptions, useViewer } from "@/data-access-layer/auth/viewer";
import { authClient } from "@/lib/better-auth/client";
import { getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Check, ChevronsUpDown, LogOut, Users } from "lucide-react";

export function DashboardSidebarUser() {
  const { isMobile, state } = useSidebar();
  const isExpanded = state === "expanded" || isMobile;
  const { viewer, logoutMutation } = useViewer();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["device-sessions"],
    queryFn: async () => {
      const { data, error } = await authClient.multiSession.listDeviceSessions();
      if (error) throw error;
      return data ?? [];
    },
  });

  const switchSession = useMutation({
    mutationFn: async (sessionToken: string) => {
      const { error } = await authClient.multiSession.setActive({ sessionToken });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries(viewerqueryOptions);
      await qc.invalidateQueries({ queryKey: ["device-sessions"] });
      await router.invalidate();
      const viewerResult = await qc.fetchQuery(viewerqueryOptions);
      const role = getUserAppRole(viewerResult.data?.user);
      await navigate({ to: getHomePathForRole(role) });
    },
  });

  if (!viewer.user) {
    return null;
  }

  const otherSessions = (sessionsQuery.data ?? []).filter(
    (entry) => entry.session.token !== viewer.session?.token,
  );

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
                <Check className="text-base-content/50 size-4 shrink-0" />
              </div>
            </DropdownMenuLabel>
            {otherSessions.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-base-content/50 flex items-center gap-1.5 text-xs font-normal">
                  <Users className="size-3.5" />
                  Switch account
                </DropdownMenuLabel>
                {otherSessions.map((entry) => (
                  <DropdownMenuItem
                    key={entry.session.token}
                    disabled={switchSession.isPending}
                    onClick={() => switchSession.mutate(entry.session.token)}
                  >
                    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                      <span className="truncate">{entry.user.name}</span>
                      <span className="text-base-content/60 truncate text-xs">{entry.user.email}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
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
