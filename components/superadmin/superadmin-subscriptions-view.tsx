"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SubscriptionStatusBadge } from "@/components/shared/subscription-status-badge";
import { usePlatform } from "@/components/platform/platform-provider";
import { getEffectiveSubscriptionStatus } from "@/lib/access-control";
import { formatDate } from "@/lib/format";
import * as subscriptionRequestService from "@/lib/services/subscription-request.service";
import type { SubscriptionRequest } from "@/types/subscription-request";
import { PLAN_PRICING } from "@/types/subscription-request";
import type { Organization } from "@/types/platform";

export function SuperAdminSubscriptionsView() {
  const { organizations } = usePlatform();
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<SubscriptionRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SubscriptionRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscriptionRequestService.subscribeToAllSubscriptionRequests(
      (data) => {
        setRequests(data);
        setLoaded(true);
      },
      (message) => {
        setError(message);
        setLoaded(true);
      }
    );
    return unsubscribe;
  }, []);

  function orgFor(organizationId: string) {
    return organizations.find((o) => o.id === organizationId);
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await subscriptionRequestService.approveSubscriptionRequest(approveTarget.id);
      setApproveTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to approve this request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await subscriptionRequestService.rejectSubscriptionRequest(rejectTarget.id, rejectionReason.trim() || undefined);
      setRejectTarget(null);
      setRejectionReason("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to reject this request.");
    } finally {
      setSubmitting(false);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  if (!loaded) {
    return (
      <div>
        <PageHeader title="Subscription Requests" description="Plan requests awaiting NxtWise Platform Administration review" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Subscription Requests" description="Plan requests awaiting NxtWise Platform Administration review" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Subscription Requests" description="Plan requests awaiting NxtWise Platform Administration review" />

      {requests.length === 0 ? (
        <EmptyState icon={AlertCircle} title="No subscription requests yet" description="Requests appear here when an organization asks to move onto a paid plan." />
      ) : (
        <div className="space-y-8">
          <RequestTable
            title={`Pending (${pending.length})`}
            requests={pending}
            orgFor={orgFor}
            onApprove={setApproveTarget}
            onReject={setRejectTarget}
          />
          {reviewed.length > 0 && <RequestTable title="Reviewed" requests={reviewed} orgFor={orgFor} />}
        </div>
      )}

      <Dialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve plan request</DialogTitle>
            <DialogDescription>
              {approveTarget && (
                <>
                  Activate the {PLAN_PRICING[approveTarget.requestedPlan].label} plan for{" "}
                  <span className="font-medium text-foreground">{approveTarget.organizationName}</span>? This takes effect
                  immediately.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApproveTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApprove} disabled={submitting}>
              {submitting ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject plan request</DialogTitle>
            <DialogDescription>
              {rejectTarget && (
                <>
                  Reject {rejectTarget.organizationName}&apos;s request for the {PLAN_PRICING[rejectTarget.requestedPlan].label}{" "}
                  plan?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rejection-reason">Reason (optional)</Label>
            <Textarea
              id="rejection-reason"
              rows={3}
              placeholder="Share a short reason with the organization admin..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={submitting}>
              {submitting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RequestTableProps {
  title: string;
  requests: SubscriptionRequest[];
  orgFor: (organizationId: string) => Organization | undefined;
  onApprove?: (request: SubscriptionRequest) => void;
  onReject?: (request: SubscriptionRequest) => void;
}

function RequestTable({ title, requests, orgFor, onApprove, onReject }: RequestTableProps) {
  if (requests.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Organization</TableHead>
              <TableHead>Requested plan</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial status</TableHead>
              {(onApprove || onReject) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const org = orgFor(request.organizationId);
              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium text-foreground">{request.organizationName}</TableCell>
                  <TableCell>{PLAN_PRICING[request.requestedPlan].label}</TableCell>
                  <TableCell>
                    <div className="leading-tight">
                      <p className="text-foreground">{request.requestedByName}</p>
                      <p className="text-xs text-muted-foreground">{request.requestedByEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    {request.status === "pending" && <Badge variant="outline">Pending</Badge>}
                    {request.status === "approved" && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Approved
                      </span>
                    )}
                    {request.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <XCircle className="size-3.5" /> Rejected
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{org && <SubscriptionStatusBadge status={getEffectiveSubscriptionStatus(org)} />}</TableCell>
                  {(onApprove || onReject) && (
                    <TableCell className="text-right">
                      {request.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onReject?.(request)}>
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => onApprove?.(request)}>
                            Approve
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
