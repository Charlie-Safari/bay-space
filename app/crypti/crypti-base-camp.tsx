import Link from "next/link";
import MemberLookup from "../components/member-lookup";
import styles from "./crypti.module.css";

export function CryptiBaseCamp() {
  return (
    <section className={styles.hero} aria-labelledby="crypti-base-camp">
      <svg className={styles.ridgeline} viewBox="0 0 640 360" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="crypti-mountain-face" x1="310" y1="58" x2="431" y2="336" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8ed4ff" stopOpacity=".44" />
            <stop offset="1" stopColor="#155285" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id="crypti-mountain-edge" x1="314" y1="58" x2="314" y2="345" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b6e4ff" />
            <stop offset="1" stopColor="#4c9ddb" stopOpacity=".22" />
          </linearGradient>
        </defs>
        <g stroke="#478cbb" strokeOpacity=".29">
          <path d="M25 308 146 202l37 18 69-72 43 46 90-72 58 56 27-16 130 137" />
          <path d="M23 323 144 222l42 14 64-63 41 44 93-74 58 56 27-12 132 125" />
          <path d="M29 337 145 245l44 10 61-54 44 38 90-70 56 52 29-10 127 118" />
        </g>
        <path d="m43 325 125-116 41 13 111-164 83 100 31-24 76 99 83 92Z" fill="url(#crypti-mountain-face)" stroke="url(#crypti-mountain-edge)" strokeLinejoin="round" />
        <g stroke="url(#crypti-mountain-edge)" strokeLinejoin="round">
          <path d="m320 58-21 101-34 34 13 29-66 103M320 58l25 91 58 55-14 25 76 96M434 134l-8 54 20 33-1 20 65 84M168 209l13 42-59 74" />
          <path d="m259 148 40 11 18 36 28-46 58 9M209 222l36 16 20-45M403 204l23-16 20 33 64 12" opacity=".7" />
          <path d="m176 297 70-21 27-24 43-6 25-33-11-35 24-33-34-87" stroke="#b1e0ff" strokeWidth="2" strokeDasharray="4 6" opacity=".8" />
        </g>
        <circle cx="176" cy="297" r="9" stroke="#99d7ff" opacity=".65" />
        <circle cx="176" cy="297" r="3" fill="#c9ecff" />
        <circle cx="320" cy="58" r="4" fill="#d8f2ff" />
      </svg>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>+CRYPTI / The Blue Branch</p>
        <h1 id="crypti-base-camp">Base Camp</h1>
        <p className={styles.tagline}>The climb starts here.</p>
      </div>
    </section>
  );
}

export function CryptiAccess({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <CryptiBaseCamp />
      <section className={styles.access} aria-labelledby="crypti-access">
        <h2 id="crypti-access">+CRYPTI access required</h2>
        {signedIn ? (
          <Link className={styles.action} href="/briefing-room?panel=exchange">
            Open Exchange <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <>
            <p>Sign in with a +CRYPTI account to enter.</p>
            <MemberLookup variant="welcome" />
          </>
        )}
      </section>
    </>
  );
}
