"use client";

type CopyPostLinkButtonProps = {
  path: string;
};

export default function CopyPostLinkButton({ path }: CopyPostLinkButtonProps) {
  async function copyLink() {
    const url = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      aria-label="Copy link to this page"
      title="Copy link"
      className="inline-flex size-9 items-center justify-center border border-[#1d7f12] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black active:translate-y-px active:border-[#d7ffd0] active:bg-[#d7ffd0] active:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
    >
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07" />
      </svg>
    </button>
  );
}
