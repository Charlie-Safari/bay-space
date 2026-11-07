import CryptiPostDetail from "./post-detail";
import CryptiNavigation from "../crypti-navigation";
import { CryptiAccess } from "../crypti-base-camp";
import { getCurrentMember } from "../../../lib/bay-space-session";
import { canAccessCrypti } from "../../../lib/bay-space-roles";

type CryptiPostPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function CryptiPostPage({
  searchParams,
}: CryptiPostPageProps) {
  const member = await getCurrentMember();
  const hasCryptiAccess = Boolean(member && canAccessCrypti(member));
  const { id } = await searchParams;

  return (
    <>
      <CryptiNavigation showTabs={hasCryptiAccess} />
      {hasCryptiAccess ? (
        <CryptiPostDetail postId={id} />
      ) : (
        <CryptiAccess signedIn={Boolean(member)} />
      )}
    </>
  );
}
