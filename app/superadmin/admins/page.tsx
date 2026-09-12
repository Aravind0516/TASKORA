import type { Metadata } from "next";
import { SuperAdminAdminsView } from "@/components/superadmin/superadmin-admins-view";

export const metadata: Metadata = { title: "Super Admin · Administrators" };

export default function SuperAdminAdminsPage() {
  return <SuperAdminAdminsView />;
}
