"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

function getMountainStandardTime() {
  return formatter.format(new Date());
}

export default function MountainTimeFooter() {
  const [time, setTime] = useState(getMountainStandardTime);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(getMountainStandardTime());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <footer className="fixed inset-x-0 bottom-3 z-50 border-y border-[#39ff14] bg-black px-4 py-3 font-[Courier_New,Courier,monospace] text-xs font-bold uppercase tracking-[0.18em] text-[#d7ffd0] shadow-[0_0_18px_rgba(57,255,20,0.22)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-end gap-1">
        <time suppressHydrationWarning>{time}</time>
        <p>5786 Anno Mundi ; 80 a.H., Raëlian</p>
      </div>
    </footer>
  );
}
