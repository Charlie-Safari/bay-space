"use client";

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { MonthlyIcebergSignal } from "./monthly-iceberg-layout";
import styles from "./monthly-iceberg-map.module.css";

export default function MonthlyIcebergMap({
  signals,
  onOpenStory,
}: {
  signals: MonthlyIcebergSignal[];
  onOpenStory: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const previewId = useId();
  const signalCount = signals.length;

  useEffect(() => {
    if (!activeId) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Element &&
        mapRef.current?.contains(event.target) &&
        event.target.closest("[data-story-preview]")) return;
      setActiveId(null);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveId(null);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [activeId]);

  return (
    <section className={styles.panel} aria-label="This month’s Conspiracy story map">
      <div className={styles.header}>
        <p>{signalCount} {signalCount === 1 ? "story signal" : "story signals"}</p>
        {signalCount > 0 ? <p>Choose a light to preview its story.</p> : null}
      </div>
      <div ref={mapRef} className={styles.iceberg}>
        {signals.map((signal) => (
          <Fragment key={signal.id}>
          <button
            type="button"
            aria-label={`${signal.title} · ${signal.category}`}
            aria-expanded={activeId === signal.id}
            aria-controls={activeId === signal.id ? previewId : undefined}
            data-story-preview
            className={styles.marker}
            style={{
              left: `${signal.x}%`,
              top: `${signal.y}%`,
              animationDelay: `-${(signal.x + signal.y) % 6}s`,
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse" && event.buttons === 0) setActiveId(signal.id);
            }}
            onFocus={() => setActiveId(signal.id)}
            onClick={() => setActiveId(signal.id)}
          >
            <span className={styles.light} aria-hidden="true" />
          </button>
        {activeId === signal.id ? (
          <div
            id={previewId}
            className={styles.callout}
            data-side={signal.x > 50 ? "left" : "right"}
            data-below={signal.y < 18 ? "true" : undefined}
            style={{
              "--signal-x": `${signal.x}%`,
              "--signal-y": `${signal.y}%`,
            } as CSSProperties}
          >
            <svg aria-hidden="true" className={styles.leader} viewBox="0 0 60 28" preserveAspectRatio="none">
              <path d="M0 27 L29 1 H60" />
            </svg>
            <button type="button" data-story-preview className={styles.calloutFrame}
              aria-label={`Open article: ${signal.title}`} onClick={() => onOpenStory(signal.id)}>
              <strong>{signal.title}</strong>
            </button>
          </div>
        ) : null}
          </Fragment>
        ))}
        {!signalCount ? (
          <p className={styles.empty}>No stories on the iceberg for this month.</p>
        ) : null}
      </div>
      {signalCount > 0 ? (
        <details className={styles.index}>
          <summary>Story index</summary>
          <ul>
            {signals.map((signal) => (
              <li key={signal.id}>
                <button type="button" onClick={() => onOpenStory(signal.id)}>
                  <span>{signal.category}</span>
                  {signal.title}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
