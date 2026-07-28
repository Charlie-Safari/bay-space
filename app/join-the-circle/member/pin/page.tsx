import { redirect } from "next/navigation";

type PinPageProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
  }>;
};

export default async function PinPage({ searchParams }: PinPageProps) {
  const { member = "33332", name = "explorer", ref = name } = await searchParams;

  redirect(
    `/join-the-circle/member?${new URLSearchParams({
      member,
      name,
      ref,
    }).toString()}`,
  );
}
