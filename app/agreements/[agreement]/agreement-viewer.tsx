"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cryptiAgreementAcceptedStorageKey,
  cryptiAgreementVersion,
} from "../../../lib/bay-space-agreement";

type AgreementViewerProps = {
  agreement: string;
  documentHref: string;
  fallbackHref: string;
  returnTo: string;
  title: string;
};

export default function AgreementViewer({
  agreement,
  documentHref,
  fallbackHref,
  returnTo,
  title,
}: AgreementViewerProps) {
  const router = useRouter();
  const [hasConfirmedAgreement, setHasConfirmedAgreement] = useState(false);
  const [agreementMessage, setAgreementMessage] = useState("");
  const [currentMemberId, setCurrentMemberId] = useState("");
  const isCryptiAgreement = agreement === "crypti";

  useEffect(() => {
    if (!isCryptiAgreement) {
      return;
    }

    let isMounted = true;
    const hasPendingConfirmation =
      window.localStorage.getItem(cryptiAgreementAcceptedStorageKey) === "true";
    const pendingConfirmationTimer = hasPendingConfirmation
      ? window.setTimeout(() => {
          setHasConfirmedAgreement(true);
        }, 0)
      : null;

    async function syncAgreementStatus() {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = response.ok
        ? ((await response.json()) as {
            member?: {
              cryptiAgreementAcceptedAt?: string;
              cryptiAgreementVersion?: string;
              member?: string;
            } | null;
          })
        : { member: null };
      const member = data.member ?? null;

      if (!isMounted) {
        return;
      }

      setCurrentMemberId(member?.member ?? "");

      if (
        member?.cryptiAgreementAcceptedAt &&
        member.cryptiAgreementVersion === cryptiAgreementVersion
      ) {
        setHasConfirmedAgreement(true);
        setAgreementMessage("+CRYPTI user agreement saved");
      }
    }

    syncAgreementStatus().catch(() => undefined);

    return () => {
      isMounted = false;

      if (pendingConfirmationTimer) {
        window.clearTimeout(pendingConfirmationTimer);
      }
    };
  }, [isCryptiAgreement]);

  function getReturnHref() {
    const returnHref = returnTo || fallbackHref;
    const url = new URL(returnHref, window.location.origin);

    url.searchParams.set("agreementRead", agreement);

    if (isCryptiAgreement && hasConfirmedAgreement) {
      url.searchParams.set("cryptiAgreementAccepted", "true");
    }

    return `${url.pathname}${url.search}${url.hash}`;
  }

  function goBack() {
    router.push(getReturnHref());
  }

  async function saveAgreementConfirmation(memberId: string) {
    const response = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "accept-crypti-agreement" }),
    });
    const data = (await response.json()) as {
      member?: {
        cryptiAgreementAcceptedAt?: string;
        cryptiAgreementVersion?: string;
        member?: string;
      };
    };

    if (
      !response.ok ||
      !data.member?.cryptiAgreementAcceptedAt ||
      data.member.cryptiAgreementVersion !== cryptiAgreementVersion
    ) {
      setAgreementMessage("+CRYPTI agreement confirmation will save on return");
      return;
    }

    window.localStorage.removeItem(cryptiAgreementAcceptedStorageKey);
    setCurrentMemberId(data.member.member ?? memberId);
    setAgreementMessage("+CRYPTI user agreement saved");
    window.dispatchEvent(new Event("bay-space-auth"));
  }

  function updateAgreementConfirmation(checked: boolean) {
    if (!isCryptiAgreement || hasConfirmedAgreement || !checked) {
      return;
    }

    setHasConfirmedAgreement(true);
    setAgreementMessage("saving +CRYPTI user agreement");
    window.localStorage.setItem(cryptiAgreementAcceptedStorageKey, "true");

    if (!currentMemberId) {
      setAgreementMessage("+CRYPTI agreement confirmation will save on return");
      return;
    }

    saveAgreementConfirmation(currentMemberId).catch(() => {
      setAgreementMessage("+CRYPTI agreement confirmation will save on return");
    });
  }

  return (
    <main className="min-h-screen bg-black font-mono text-[#39ff14]">
      <button
        type="button"
        onClick={goBack}
        className="fixed left-3 top-3 z-50 border-2 border-[#39ff14] bg-black px-5 py-4 text-base font-black uppercase tracking-[0.18em] text-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.45)] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] sm:left-5 sm:top-5 sm:text-lg"
      >
        &lt; back
      </button>

      <section className="grid min-h-screen grid-rows-[auto_1fr]">
        <div className="border-b border-[#1d7f12] bg-[#001100] px-4 pb-4 pt-24 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            bay-space agreement
          </p>
          <h1 className="mt-2 text-xl font-black uppercase tracking-[0.16em] text-[#39ff14] sm:text-2xl">
            {title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <a
              href={documentHref}
              target="_blank"
              rel="external noopener noreferrer"
              className="inline-flex border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
            >
              open raw document
            </a>
            {isCryptiAgreement ? (
              <label className="flex max-w-2xl items-start gap-3 text-xs font-black uppercase leading-5 tracking-[0.14em] text-[#72d7ff]">
                <input
                  type="checkbox"
                  checked={hasConfirmedAgreement}
                  disabled={hasConfirmedAgreement}
                  onChange={(event) =>
                    updateAgreementConfirmation(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#72d7ff] disabled:opacity-70"
                />
                <span>
                  By checking this box, I confirm I have read this document and
                  agree to the terms and conditions of use.
                </span>
              </label>
            ) : null}
          </div>
          {isCryptiAgreement && agreementMessage ? (
            <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#72d7ff]">
              {agreementMessage}
            </p>
          ) : null}
        </div>

        <iframe
          title={title}
          src={documentHref}
          className="h-full min-h-[calc(100vh-10rem)] w-full border-0 bg-white"
        />
      </section>
    </main>
  );
}
