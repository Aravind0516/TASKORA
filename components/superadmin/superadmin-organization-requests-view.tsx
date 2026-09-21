"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import * as orgRegistrationService from "@/lib/services/organization-registration.service";
import type { OrganizationRegistrationRequest } from "@/types/organization-registration";

export function SuperAdminOrganizationRequestsView() {
  const [requests, setRequests] = useState<OrganizationRegistrationRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<OrganizationRegistrationRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reviewerComment, setReviewerComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    return orgRegistrationService.subscribeToOrganizationRegistrations(
      (data) => {
        setRequests(data);
        setLoaded(true);
      },
      (message) => {
        setError(message);
        setLoaded(true);
      }
    );
  }, []);

  function openReview(request: OrganizationRegistrationRequest) {
    setReviewTarget(request);
    setRejecting(false);
    setReviewerComment("");
    setActionError(null);
  }

  function closeReview(open: boolean) {
    if (!open) {
      setReviewTarget(null);
      setRejecting(false);
      setReviewerComment("");
      setActionError(null);
    }
  }

  async function handleApprove() {
    if (!reviewTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await orgRegistrationService.approveOrganizationRegistration(reviewTarget.id);
      setReviewTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to approve this request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!reviewTarget) return;
    if (reviewerComment.trim().length === 0) {
      setActionError("A reason is required to reject a registration request.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await orgRegistrationService.rejectOrganizationRegistration(reviewTarget.id, reviewerComment.trim());
      setReviewTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to reject this request.");
    } finally {
      setSubmitting(false);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  if (!loaded) {
    return (
      <div>
        <PageHeader title="Organization Requests" description="New organization registrations awaiting Super Admin review" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Organization Requests" description="New organization registrations awaiting Super Admin review" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Organization Requests" description="New organization registrations awaiting Super Admin review" />

      {requests.length === 0 ? (
        <EmptyState icon={AlertCircle} title="No registration requests yet" description="Requests appear here when someone registers a new organization." />
      ) : (
        <div className="space-y-8">
          <RequestTable title={`Pending (${pending.length})`} requests={pending} onReview={openReview} />
          {reviewed.length > 0 && <RequestTable title="Reviewed" requests={reviewed} onReview={openReview} />}
        </div>
      )}

      <Dialog open={reviewTarget !== null} onOpenChange={closeReview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review registration</DialogTitle>
            <DialogDescription>{reviewTarget?.organizationName}</DialogDescription>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Organization" value={reviewTarget.organizationName} />
                <Field label="Type" value={reviewTarget.organizationType} />
                <Field label="Industry" value={reviewTarget.industry} />
                <Field label="Size" value={reviewTarget.organizationSize} />
                <Field label="Website" value={reviewTarget.website} />
                <Field label="Location" value={reviewTarget.location} />
              </div>
              {reviewTarget.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="mt-0.5 text-foreground">{reviewTarget.description}</p>
                </div>
              )}
              <div className="rounded-lg border border-border bg-surface-muted p-3.5">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Requester</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Full Name" value={reviewTarget.fullName} />
                  <Field label="Email" value={reviewTarget.email} />
                  <Field label="Phone" value={reviewTarget.phone} />
                  <Field label="Submitted" value={formatDate(reviewTarget.submittedAt)} />
                </div>
              </div>

              {rejecting && (
                <div className="space-y-1.5">
                  <Label htmlFor="reviewer-comment">Reason for rejection (required)</Label>
                  <Textarea
                    id="reviewer-comment"
                    rows={3}
                    placeholder="e.g. Organization information could not be verified."
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                  />
                </div>
              )}

              {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            </div>
          )}

          <DialogFooter>
            {reviewTarget?.status !== "PENDING" ? (
              <Button variant="outline" onClick={() => setReviewTarget(null)}>
                Close
              </Button>
            ) : rejecting ? (
              <>
                <Button type="button" variant="outline" onClick={() => setRejecting(false)} disabled={submitting}>
                  Back
                </Button>
                <Button type="button" variant="destructive" onClick={handleReject} disabled={submitting || reviewerComment.trim().length === 0}>
                  {submitting ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setRejecting(true)} disabled={submitting}>
                  Reject
                </Button>
                <Button type="button" onClick={handleApprove} disabled={submitting}>
                  {submitting ? "Approving..." : "Approve"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value || "—"}</p>
    </div>
  );
}

interface RequestTableProps {
  title: string;
  requests: OrganizationRegistrationRequest[];
  onReview: (request: OrganizationRegistrationRequest) => void;
}

function RequestTable({ title, requests, onReview }: RequestTableProps) {
  if (requests.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Organization</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium text-foreground">{request.organizationName}</TableCell>
                <TableCell>{request.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{request.email}</TableCell>
                <TableCell className="text-muted-foreground">{request.organizationType || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(request.submittedAt)}</TableCell>
                <TableCell>
                  {request.status === "PENDING" && (
                    <Badge variant="outline">
                      <Clock3 className="size-3" /> Pending
                    </Badge>
                  )}
                  {request.status === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="size-3.5" /> Approved
                    </span>
                  )}
                  {request.status === "REJECTED" && (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <XCircle className="size-3.5" /> Rejected
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => onReview(request)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
