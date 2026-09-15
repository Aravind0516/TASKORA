import type { Metadata } from "next";
import { AdminBillingView } from "@/components/billing/admin-billing-view";

export const metadata: Metadata = { title: "Billing" };

export default function AdminBillingPage() {
  return <AdminBillingView />;
}
