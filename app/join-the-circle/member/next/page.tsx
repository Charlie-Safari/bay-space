import { redirect } from "next/navigation";

type CircleNextProps = {
  searchParams: Promise<{
    member?: string;
    name?: string;
    ref?: string;
  }>;
};

export default async function CircleNext({ searchParams }: CircleNextProps) {
  const { member = "33332", name = "explorer", ref = name } = await searchParams;

  redirect(
    `/join-the-circle/member?${new URLSearchParams({
      member,
      name,
      ref,
    }).toString()}`,
  );
}
