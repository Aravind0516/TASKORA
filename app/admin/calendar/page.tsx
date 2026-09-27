import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Admin · Calendar" };

// The member workspace's calendar, inside the admin console — see lib/shell-routes.ts.
export default function AdminCalendarPage() {
  return <CalendarView />;
}
