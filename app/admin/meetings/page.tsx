import type { Metadata } from "next";
import { MeetingsView } from "@/components/meetings/meetings-view";

export const metadata: Metadata = { title: "Admin · Meetings" };

// Same view as the member workspace's /meetings, rendered inside the admin
// console (whose layout provides the same workspace data) so an Organization
// Admin never leaves the admin shell — see lib/shell-routes.ts.
export default function AdminMeetingsPage() {
  return <MeetingsView />;
}
