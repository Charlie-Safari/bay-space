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
      className="border border-[#1d7f12] px-3 py-2 text-xs font-black tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
    >
      Ctrl+C 🔗 to this page
    </button>
  );
}
