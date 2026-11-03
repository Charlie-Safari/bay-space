import { redirect } from "next/navigation";
import { getCurrentMember } from "../../lib/bay-space-session";
import LoginScreen from "./login-screen";

type LoginPageProps = {
  searchParams: Promise<{ account?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const activeMember = await getCurrentMember();

  if (activeMember) {
    redirect(`/briefing-room?member=${activeMember.member}`);
  }

  const params = await searchParams;
  const account = Array.isArray(params.account)
    ? params.account[0] ?? ""
    : params.account ?? "";

  if (!/^\d{5}$/.test(account)) {
    redirect("/");
  }

  return <LoginScreen account={account} />;
}
