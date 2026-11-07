"use client";

import { useId } from "react";
import styles from "./current-event-rating-scale.module.css";

type CurrentEventRatingScaleProps = {
  title: string;
  labels: readonly [string, string, string];
  value: number;
  savedValue: number | null;
  voteCount: number;
  otherVoteCounts?: number[];
  disabled: boolean;
  saving: boolean;
  onChange: (value: number) => void;
  onVote: () => void;
};

export default function CurrentEventRatingScale({
  title, labels, value, savedValue, voteCount, otherVoteCounts, disabled, saving, onChange, onVote,
}: CurrentEventRatingScaleProps) {
  const titleId = useId();
  const legendId = useId();
  const position = savedValue ?? value;
  const selectedLabel = position === 0 ? "Unrated"
    : position <= 3 ? labels[0] : position <= 7 ? labels[1] : labels[2];

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="bay-terminal-copy text-xs text-[#7f9f78]">
          {title}
        </h3>
        <p className="bay-terminal-copy text-xs text-[#7f9f78]">
          {voteCount} {voteCount === 1 ? "vote" : "votes"}
          {position === 0 ? " / unrated" : ""}
        </p>
      </div>
      <input
        type="range"
        min="1"
        max="11"
        step="1"
        value={position || 1}
        data-unrated={position === 0}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={() => { if (value === 0) onChange(1); }}
        onKeyDown={(event) => {
          if (value === 0 && (event.key === " " || event.key === "Enter" || event.key === "ArrowLeft" || event.key === "Home")) {
            event.preventDefault();
            onChange(1);
          }
        }}
        disabled={disabled || saving || savedValue !== null}
        className={styles.slider}
        aria-labelledby={titleId}
        aria-describedby={legendId}
        aria-valuetext={selectedLabel}
      />
      {savedValue !== null && otherVoteCounts?.some((count) => count > 0) ? (
        <div
          className={styles.voteDots}
          role="img"
          aria-label={`Other votes by position from left to right: ${otherVoteCounts.join(", ")}`}
        >
          {otherVoteCounts.map((count, scoreIndex) => (
            <span key={scoreIndex} className={styles.voteDotStack} aria-hidden="true">
              {Array.from({ length: count }, (_, index) => <span key={index} className={styles.voteDot} />)}
            </span>
          ))}
        </div>
      ) : null}
      <div id={legendId} className={styles.legend}>
        {labels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <button
        type="button"
        disabled={disabled || saving || (savedValue === null && value === 0)}
        onClick={onVote}
        className="bay-terminal-copy w-fit border border-[#39ff14] px-3 py-2 text-xs text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:cursor-not-allowed disabled:border-[#1d7f12] disabled:text-[#7f9f78] disabled:hover:bg-transparent disabled:hover:text-[#7f9f78]"
      >
        {saving ? "saving" : savedValue !== null ? "remove vote" : "vote"}
      </button>
    </div>
  );
}
