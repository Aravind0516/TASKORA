import type { Metadata } from "next";
import { InviteLandingView } from "@/components/invitations/invite-landing-view";

export const metadata: Metadata = { title: "Accept Invitation" };

export default async function InviteAcceptPage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;

  return <InviteLandingView token={token} />;
}
