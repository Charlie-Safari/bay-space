import { notFound } from "next/navigation";
import {
  bayoPlusAgreementDocumentHref,
  baySpaceAgreementDocumentHref,
} from "../../../lib/bay-space-agreement";
import AgreementViewer from "./agreement-viewer";

type AgreementPageProps = {
  params: Promise<{
    agreement: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

const agreements = {
  "bay-space": {
    documentHref: baySpaceAgreementDocumentHref,
    fallbackHref: "/join-the-circle/member/confirm",
    title: "privacy + user agreement",
  },
  crypti: {
    documentHref: bayoPlusAgreementDocumentHref,
    fallbackHref: "/briefing-room",
    title: "+CRYPTI user agreement",
  },
};

export default async function AgreementPage({
  params,
  searchParams,
}: AgreementPageProps) {
  const { agreement } = await params;
  const { returnTo = "" } = await searchParams;
  const agreementConfig = agreements[agreement as keyof typeof agreements];

  if (!agreementConfig) {
    notFound();
  }

  return (
    <AgreementViewer
      documentHref={agreementConfig.documentHref}
      fallbackHref={agreementConfig.fallbackHref}
      returnTo={returnTo}
      title={agreementConfig.title}
    />
  );
}
