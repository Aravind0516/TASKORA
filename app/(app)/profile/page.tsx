import type { Metadata } from "next";
import { MyProfileView } from "@/components/candidate/my-profile-view";

export const metadata: Metadata = { title: "My Profile · TASKORA" };

export default function ProfilePage() {
  return <MyProfileView />;
}
