import CryptiTerminal from "./crypti-terminal";
import CryptiNavigation from "./crypti-navigation";
import { CryptiAccess } from "./crypti-base-camp";
import { getCurrentMember } from "../../lib/bay-space-session";
import { canAccessCrypti } from "../../lib/bay-space-roles";

export default async function Crypti() {
  const member = await getCurrentMember();
  if (member && canAccessCrypti(member)) return <CryptiTerminal />;

  return (
    <>
      <CryptiNavigation showTabs={false} />
      <CryptiAccess signedIn={Boolean(member)} />
    </>
  );
}
