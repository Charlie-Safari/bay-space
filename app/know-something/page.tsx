import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "../../lib/bay-space-session";
import { knowSomethingArchiveHref } from "../../lib/theory-categories";
import KnowSomethingForm from "./know-something-form";
import styles from "./know-something.module.css";

export default async function KnowSomethingPage() {
  const member = await getCurrentMember();
  if (member) redirect(knowSomethingArchiveHref);

  return (
    <main className="min-h-screen bg-[#030604] px-4 py-10 font-mono text-[#d8ecd2] sm:py-16">
      <div className="mx-auto grid max-w-2xl gap-6">
        <Link href="/" aria-label="Bay Space home" className={styles.logoLink}>
          <span className={styles.hologram}>
            <Image
              src="/global-logo-bay-space.png"
              alt=""
              width={128}
              height={129}
              className={styles.logo}
              sizes="(min-width: 640px) 128px, 96px"
            />
          </span>
        </Link>
        <Link href="/" className="w-fit text-sm text-[#a2d59b] underline underline-offset-4">← Bay Space</Link>
        <section className="rounded-2xl border border-[#426840] bg-[#0b170b] p-5 sm:p-8" aria-labelledby="drop-box-title">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a2d59b]">Conspiracy iceberg · Level 06</p>
          <h1 id="drop-box-title" className="mt-3 text-3xl font-black uppercase sm:text-4xl">Know Something</h1>
          <p className="mt-3 text-sm leading-6 text-[#b6ccb2]">Write what you know. Your note will appear anonymously in the iceberg.</p>
          <KnowSomethingForm />
        </section>
      </div>
    </main>
  );
}
