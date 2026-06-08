type TerminalLoadingShellProps = {
  label?: string;
  title?: string;
};

export default function TerminalLoadingShell({
  label = "c:\\bay-space\\system> switching-channel",
  title = "loading signal",
}: TerminalLoadingShellProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="w-full border-2 border-[#1d7f12] bg-black px-5 py-6 font-mono text-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.16)]"
    >
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
        {label}
      </p>
      <div className="mt-5 grid gap-4">
        <h1 className="text-3xl font-black uppercase tracking-[0.18em] text-[#39ff14] [text-shadow:0_0_12px_#39ff14] sm:text-5xl">
          {title}
        </h1>
        <div className="grid gap-2">
          <span className="h-2 w-3/4 max-w-xl bg-[#1d7f12]/70 shadow-[0_0_12px_rgba(57,255,20,0.35)]" />
          <span className="h-2 w-1/2 max-w-md bg-[#1d7f12]/45" />
          <span className="h-2 w-2/3 max-w-lg bg-[#1d7f12]/35" />
        </div>
        <p className="border-l-2 border-[#39ff14] pl-4 text-sm font-black uppercase tracking-[0.18em] text-[#d7ffd0]">
          receiving transmission
        </p>
      </div>
    </div>
  );
}
