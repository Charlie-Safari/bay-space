"use client";

import { useRouter } from "next/navigation";

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

  function getReturnHref() {
    const returnHref = returnTo || fallbackHref;
    const url = new URL(returnHref, window.location.origin);

    url.searchParams.set("agreementRead", agreement);

    return `${url.pathname}${url.search}${url.hash}`;
  }

  function goBack() {
    router.push(getReturnHref());
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
          <a
            href={documentHref}
            target="_blank"
            rel="external noopener noreferrer"
            className="mt-3 inline-flex border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
          >
            open raw document
          </a>
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
