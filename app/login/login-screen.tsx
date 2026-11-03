"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login-screen.module.css";

type LoginScreenProps = {
  account: string;
};

type LoginMember = {
  member: string;
  name: string;
  refName: string;
};

export default function LoginScreen({ account }: LoginScreenProps) {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [member, setMember] = useState<LoginMember | null>(null);
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/members?lookup=${encodeURIComponent(account)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("account not found");
        }

        return response.json() as Promise<{ member?: LoginMember | null }>;
      })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        if (!data.member) {
          router.replace("/");
          return;
        }

        setMember(data.member);
        setIsLoading(false);
        window.requestAnimationFrame(() => passwordRef.current?.focus());
      })
      .catch(() => {
        if (isMounted) {
          router.replace("/");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [account, router]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ member: account, pin: password }),
      });
      const data = (await response.json()) as {
        member?: { member: string } | null;
      };
      const memberId = data.member?.member ?? "";

      if (!response.ok || !memberId) {
        setPassword("");
        setStatusMessage(
          response.status === 401 ? "password incorrect" : "login unavailable",
        );
        window.requestAnimationFrame(() => passwordRef.current?.focus());
        return;
      }

      window.localStorage.setItem("bay-space-active-member", memberId);
      window.dispatchEvent(new Event("bay-space-auth"));
      router.push(`/briefing-room?member=${memberId}`);
    } catch {
      setStatusMessage("login unavailable");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true" />

      <section className={styles.shell} aria-labelledby="login-title">
        <header className={styles.header}>
          <Link href="/" className={styles.wordmark} aria-label="Bay Space home">
            BAY<span>—</span>SPACE
          </Link>
          <span className={styles.secure}>secure member entry</span>
        </header>

        <div className={styles.stage}>
          <div className={styles.card}>
            <p className={styles.eyebrow}>account located</p>
            <h1 id="login-title">Enter Bay Space</h1>

            {isLoading || !member ? (
              <p className={styles.loading}>confirming account...</p>
            ) : (
              <>
                <div className={styles.identity}>
                  <span>account name</span>
                  <strong>{member.name || member.refName}</strong>
                  <small>member #{member.member}</small>
                </div>

                <form onSubmit={submitPassword} className={styles.form}>
                  <label htmlFor="member-password">Password</label>
                  <input
                    ref={passwordRef}
                    id="member-password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={24}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setStatusMessage("");
                    }}
                    aria-invalid={Boolean(statusMessage)}
                  />
                  <button type="submit" disabled={!password || isSubmitting}>
                    {isSubmitting ? "entering..." : "Enter Bay Space"}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>

                {statusMessage ? (
                  <p className={styles.status} aria-live="polite">
                    {statusMessage}
                  </p>
                ) : null}
              </>
            )}

            <Link href="/" className={styles.backLink}>
              ← use a different account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
