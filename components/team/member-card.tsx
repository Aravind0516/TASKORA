import { MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { TeamMember } from "@/types/team";

const ROLE_VARIANT = {
  Admin: "default",
  "Team Member": "outline",
} as const;

interface MemberCardProps {
  member: TeamMember;
  onSelect?: (member: TeamMember) => void;
  onRemove?: (member: TeamMember) => void;
}

export function MemberCard({ member, onSelect, onRemove }: MemberCardProps) {
  const { getTeamsForMember } = useWorkspace();
  const teamNames = getTeamsForMember(member.id)
    .map((team) => team.name)
    .join(" · ");

  return (
    <Card
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(member)}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(member);
        }
      }}
      className={
        onSelect
          ? "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          : undefined
      }
    >
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <Avatar size="lg">
          <AvatarFallback>{initials(member.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
          <p className="truncate text-xs text-muted-foreground">{member.title}</p>
          <p className="truncate text-[11px] text-muted-foreground/70">{member.email}</p>
          {teamNames && (
            <p className="truncate text-[11px] text-muted-foreground/70">{teamNames}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={ROLE_VARIANT[member.role]}>{member.role}</Badge>
            {member.functionalRole && <Badge variant="outline">{member.functionalRole}</Badge>}
          </div>
        </div>
        {onRemove && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Actions for ${member.name}`}
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => onRemove(member)}>
                <Trash2 />
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
