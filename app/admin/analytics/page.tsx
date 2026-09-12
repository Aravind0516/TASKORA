import type { Metadata } from "next";
import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";

export const metadata: Metadata = { title: "Admin · Analytics" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsView />;
}
