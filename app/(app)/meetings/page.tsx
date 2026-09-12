import type { Metadata } from "next";
import { MeetingsView } from "@/components/meetings/meetings-view";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return <MeetingsView />;
}
