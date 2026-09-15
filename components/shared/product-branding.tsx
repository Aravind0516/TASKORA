"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Centralized NxtWise ownership-branding copy and placements — every screen
// that needs to say "TASKORA is an NxtWise product" pulls from here rather
// than duplicating the strings, so tone/wording only ever needs to change in
// one place. TASKORA stays the primary, larger visual identity everywhere
// this appears; NxtWise is always the smaller, secondary line underneath it
// — never the reverse.

export const NXTWISE_PRIMARY_LINE = "A product by NxtWise IT Pvt. Ltd.";
export const NXTWISE_SECONDARY_LINE = "TASKORA — An NxtWise Product";
export const NXTWISE_LEGAL_LINE = "© 2026 NxtWise IT Pvt. Ltd. All rights reserved.";

/** Below the auth card on /login, /register, and /forgot-password — subtle, doesn't compete with the form above it. */
export function AuthProductFooter() {
  return (
    <div className="mt-8 text-center">
      <p className="text-xs text-muted-foreground">{NXTWISE_PRIMARY_LINE}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">{NXTWISE_LEGAL_LINE}</p>
    </div>
  );
}

/**
 * Sidebar footer block for the main app shell and the admin/superadmin
 * platform shell — sits below the nav, above the collapse toggle. Hidden
 * entirely when the sidebar is collapsed, matching how the TASKORA wordmark
 * itself already hides at that width (there's no room for two lines of text
 * at 68px, and a truncated fragment would look broken, not premium).
 */
export function SidebarProductFooter({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="border-t border-sidebar-border px-4 py-3 text-center">
      <p className="text-[11px] leading-tight text-sidebar-foreground/45">A product by</p>
      <p className="text-[11px] leading-tight font-medium text-sidebar-foreground/70">NxtWise IT Pvt. Ltd.</p>
    </div>
  );
}

/**
 * A single "About TASKORA" entry for an account/user dropdown menu — owns
 * its own dialog state so callers just drop <AboutTaskoraMenuItem /> in
 * alongside their other DropdownMenuItems, no wiring required. Matches this
 * repo's existing pattern of a dropdown action opening a dialog rendered as
 * a sibling (not nested inside DropdownMenuContent, which unmounts on close).
 */
export function AboutTaskoraMenuItem() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenuItem onClick={() => setOpen(true)}>
        <Info />
        About TASKORA
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>TASKORA</DialogTitle>
            <DialogDescription>An NxtWise Product</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>NxtWise IT Pvt. Ltd.</p>
            <p className="text-xs text-muted-foreground/70">{NXTWISE_LEGAL_LINE}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
