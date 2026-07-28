"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bayoPlusAgreementHref,
  baySpaceAgreementHref,
} from "../../../../lib/bay-space-agreement";
import { isCrypti } from "../../../../lib/bay-space-roles";
import { openExternalBrowser } from "../../../components/open-external-browser";
import styles from "./password-confirm-form.module.css";

type PasswordConfirmFormProps = {
  member: string;
  name: string;
  refName: string;
  roles: string;
  title: string;
};

export default function PasswordConfirmForm({
  member,
  name,
  refName,
  roles,
  title,
}: PasswordConfirmFormProps) {
  const router = useRouter();
  const [confirmPin, setConfirmPin] = useState("");
  const [isWrongPassword, setIsWrongPassword] = useState(false);
  const [isAgreementAlert, setIsAgreementAlert] = useState(false);
  const [isBayoPlusAgreementAlert, setIsBayoPlusAgreementAlert] =
    useState(false);
  const [isAgreementError, setIsAgreementError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasOpenedAgreement, setHasOpenedAgreement] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [hasOpenedBayoPlusAgreement, setHasOpenedBayoPlusAgreement] =
    useState(false);
  const [hasAcceptedBayoPlusAgreement, setHasAcceptedBayoPlusAgreement] =
    useState(false);
  const needsBayoPlusAgreement = isCrypti(roles);

  function flashError(message: string) {
    setErrorMessage("");
    setIsWrongPassword(false);
    setIsAgreementAlert(false);
    setIsBayoPlusAgreementAlert(false);
    setIsAgreementError(false);
    window.setTimeout(() => {
      setErrorMessage(message);
      setIsWrongPassword(true);
    }, 0);
  }

  function flashAgreementError(
    message: string,
    alerts: { bayoPlus?: boolean; user?: boolean } = {},
  ) {
    setErrorMessage("");
    setIsWrongPassword(false);
    setIsAgreementAlert(false);
    setIsBayoPlusAgreementAlert(false);
    setIsAgreementError(false);
    window.setTimeout(() => {
      setErrorMessage(message);
      setIsAgreementAlert(Boolean(alerts.user));
      setIsBayoPlusAgreementAlert(Boolean(alerts.bayoPlus));
      setIsAgreementError(true);
    }, 0);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const needsUserAgreementOpen = !hasOpenedAgreement;
    const needsBayoPlusAgreementOpen =
      needsBayoPlusAgreement && !hasOpenedBayoPlusAgreement;

    if (needsUserAgreementOpen || needsBayoPlusAgreementOpen) {
      flashAgreementError(
        needsUserAgreementOpen && needsBayoPlusAgreementOpen
          ? "please read agreements"
          : needsUserAgreementOpen
            ? "please read user agreement"
            : "please read bayo+ agreement",
        {
          bayoPlus: needsBayoPlusAgreementOpen,
          user: needsUserAgreementOpen,
        },
      );
      return;
    }

    if (!hasAcceptedAgreement) {
      flashAgreementError("please read user agreement");
      return;
    }

    if (needsBayoPlusAgreement && !hasAcceptedBayoPlusAgreement) {
      flashAgreementError("please read bayo+ agreement");
      return;
    }

    if (!confirmPin || isSaving) {
      flashError("try again");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/members/${member}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agreementAccepted: true,
          bayoPlusAgreementAccepted: needsBayoPlusAgreement
            ? hasAcceptedBayoPlusAgreement
            : undefined,
          confirmPin,
          name,
          refName,
          roles,
          title,
        }),
      });
      const data = (await response.json()) as {
        member?: {
          member: string;
          name: string;
          refName: string;
          roles: string;
          title: string;
        };
        message?: string;
      };
      setIsSaving(false);

      if (!response.ok || !data.member) {
        flashError(data.message ?? "save failed");
        return;
      }

      const savedMemberId = data.member.member;
      window.localStorage.setItem("bay-space-active-member", savedMemberId);
      window.localStorage.setItem(
        "bay-space-active-member-roles",
        data.member.roles,
      );
      window.dispatchEvent(new Event("bay-space-auth"));
      router.push(`/join-the-circle/member/complete?member=${savedMemberId}`);
    } catch {
      setIsSaving(false);
      flashError("save failed");
    }
  }

  return (
    <form onSubmit={saveMember} className="mt-8 w-full max-w-md">
      <div
        className={isWrongPassword ? styles.alert : ""}
        onAnimationEnd={() => setIsWrongPassword(false)}
      >
        <input
          aria-label="Create password"
          autoComplete="new-password"
          placeholder="Create a Password"
          type="password"
          value={confirmPin}
          onChange={(event) => {
            setConfirmPin(event.target.value.slice(0, 24));
          }}
          className="w-full border border-[#1d7f12] bg-[#001100] px-3 py-3 text-2xl font-black tracking-[0.18em] text-[#39ff14] outline-none placeholder:italic placeholder:text-[#1d7f12] focus:ring-2 focus:ring-[#39ff14]"
          autoFocus
        />
      </div>
      <a
        href={baySpaceAgreementHref}
        target="_blank"
        rel="external noopener noreferrer"
        onClick={(event) => {
          if (openExternalBrowser(baySpaceAgreementHref)) {
            event.preventDefault();
          }

          setHasOpenedAgreement(true);
        }}
        className={`mt-5 inline-flex w-full items-center justify-center border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
          isAgreementAlert ? styles.alert : ""
        }`}
        onAnimationEnd={() => setIsAgreementAlert(false)}
      >
        VIEW USER AGREEMENT
      </a>
      <label className="mt-4 flex items-start gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
        <input
          type="checkbox"
          checked={hasAcceptedAgreement}
          onChange={(event) => {
            if (event.target.checked && !hasOpenedAgreement) {
              flashAgreementError("please read user agreement", { user: true });
              setHasAcceptedAgreement(false);
              return;
            }

            setHasAcceptedAgreement(event.target.checked);
          }}
          className="mt-0.5 h-4 w-4 accent-[#39ff14]"
        />
        <span>
          I have read and agree the bay-space privacy notice and user agreement.
        </span>
      </label>
      {needsBayoPlusAgreement ? (
        <>
          <a
            href={bayoPlusAgreementHref}
            target="_blank"
            rel="external noopener noreferrer"
            onClick={(event) => {
              if (openExternalBrowser(bayoPlusAgreementHref)) {
                event.preventDefault();
              }

              setHasOpenedBayoPlusAgreement(true);
            }}
            className={`mt-5 inline-flex w-full items-center justify-center border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
              isBayoPlusAgreementAlert ? styles.alert : ""
            }`}
            onAnimationEnd={() => setIsBayoPlusAgreementAlert(false)}
          >
            VIEW +CRYPTI USER AGREEMENT
          </a>
          <label className="mt-4 flex items-start gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
            <input
              type="checkbox"
              checked={hasAcceptedBayoPlusAgreement}
              onChange={(event) => {
                if (event.target.checked && !hasOpenedBayoPlusAgreement) {
                  flashAgreementError("please read bayo+ agreement", {
                    bayoPlus: true,
                  });
                  setHasAcceptedBayoPlusAgreement(false);
                  return;
                }

                setHasAcceptedBayoPlusAgreement(event.target.checked);
              }}
              className="mt-0.5 h-4 w-4 accent-[#39ff14]"
            />
            <span>I confirm I read and agree the +Crypti user agreement.</span>
          </label>
        </>
      ) : null}
      {isWrongPassword || isAgreementError ? (
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSaving}
        className="mt-3 w-full border border-[#39ff14] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
      >
        {isSaving ? "entering" : "enter bay-space"}
      </button>
    </form>
  );
}
