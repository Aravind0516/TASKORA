import type { Metadata } from "next";
import { SuperAdminSubscriptionsView } from "@/components/superadmin/superadmin-subscriptions-view";

export const metadata: Metadata = { title: "Subscription Requests" };

export default function SuperAdminSubscriptionsPage() {
  return <SuperAdminSubscriptionsView />;
}
