import AgentBadgeWelcome from "./agent-badge-welcome";

type CompletePageProps = {
  searchParams: Promise<{
    member?: string;
  }>;
};

export default async function CompletePage({ searchParams }: CompletePageProps) {
  const { member = "33332" } = await searchParams;

  return <AgentBadgeWelcome member={member} />;
}
