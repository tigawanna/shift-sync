import { Badge } from "@/components/ui/badge";
import { Ban, CircleCheck, CircleX, Clock, Hourglass, Undo2, UserRound } from "lucide-react";
import { coverageStatusLabel } from "./coverage-labels";

const statusIcon = {
  approved: CircleCheck,
  rejected: CircleX,
  withdrawn: Undo2,
  cancelled: Ban,
  expired: Clock,
  pending_peer: UserRound,
  pending_manager: Hourglass,
  open: Clock,
} as const;

function badgeVariant(status: string) {
  if (status === "rejected" || status === "cancelled") return "destructive" as const;
  if (
    status === "approved" ||
    status === "pending_peer" ||
    status === "pending_manager" ||
    status === "open"
  ) {
    return "default" as const;
  }
  return "outline" as const;
}

export function CoverageStatusBadge({
  status,
  audience = "staff",
}: {
  status: string;
  audience?: "staff" | "manager";
}) {
  const Icon = status in statusIcon ? statusIcon[status as keyof typeof statusIcon] : Clock;

  return (
    <Badge
      variant={badgeVariant(status)}
      className="h-auto min-h-6 max-w-full px-2.5 py-1 text-left leading-snug whitespace-normal"
    >
      <Icon aria-hidden />
      {coverageStatusLabel(status, audience)}
    </Badge>
  );
}
