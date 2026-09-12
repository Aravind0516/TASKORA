"use client";

import { MoreHorizontal, Send, Ban, MailPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { InvitationStatusBadge } from "@/components/invitations/invitation-status-badge";
import { initials, formatDate } from "@/lib/format";
import type { PlatformTeam } from "@/types/platform";
import type { PlatformInvitation } from "@/types/invitation";

interface PendingInvitationsSectionProps {
  invitations: PlatformInvitation[];
  teams: PlatformTeam[];
  onResend: (invitation: PlatformInvitation) => void;
  onCancel: (invitation: PlatformInvitation) => void;
}

export function PendingInvitationsSection({ invitations, teams, onResend, onCancel }: PendingInvitationsSectionProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>People who&apos;ve been invited but haven&apos;t activated their account yet</CardDescription>
      </CardHeader>

      {invitations.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState icon={MailPlus} title="No pending invitations" description="Invitations you send will show up here until they're accepted." />
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const team = teams.find((t) => t.id === invitation.teamId);
                const isActionable = invitation.status === "pending";
                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarFallback>{initials(invitation.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium text-foreground">{invitation.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{invitation.email}</TableCell>
                    <TableCell className="text-muted-foreground">{team?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <InvitationStatusBadge status={invitation.status} emailSent={invitation.emailSent} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invitation.createdAt)}</TableCell>
                    <TableCell>
                      {isActionable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${invitation.name}`} />}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onResend(invitation)}>
                              <Send />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => onCancel(invitation)}>
                              <Ban />
                              Cancel Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
