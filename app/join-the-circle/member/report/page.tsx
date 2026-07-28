import { redirect } from "next/navigation";

type ReportPageProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
  }>;
};

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { member = "33332", name = "explorer", ref = name } = await searchParams;

  redirect(
    `/join-the-circle/member?${new URLSearchParams({
      member,
      name,
      ref,
    }).toString()}`,
  );
}
