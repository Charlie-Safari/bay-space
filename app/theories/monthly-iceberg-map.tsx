"use client";

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { monthlyIcebergCategoryBands, type MonthlyIcebergSignal } from "./monthly-iceberg-layout";
import styles from "./monthly-iceberg-map.module.css";

export default function MonthlyIcebergMap({
  signals,
  readerId,
  onOpenStory,
  variant = "depths",
}: {
  signals: MonthlyIcebergSignal[];
  readerId: string | null | undefined;
  onOpenStory: (id: string) => void;
  variant?: "depths" | "crest";
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>();
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewId = useId();
  const categoryOverlayId = useId();
  const signalCount = signals.length;
  const isCrest = variant === "crest";

  function cancelHover() {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
  }

  useEffect(() => cancelHover, []);

  useEffect(() => {
    if (!readerId) return;

    const controller = new AbortController();
    const category = isCrest ? "daily-food" : "theory";
    fetch(`/api/posts/recent-reads?category=${category}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load reading history");
        const { postIds } = await response.json() as { postIds: string[] };
        if (!controller.signal.aborted) setReadIds(new Set(postIds));
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryUnavailable(true);
      });

    return () => controller.abort();
  }, [readerId, isCrest]);

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
    <section className={styles.panel} aria-label={isCrest ? "Current Events story map" : "This month’s Conspiracy story map"}>
      <div className={styles.header}>
        <p>{signalCount} {signalCount === 1 ? "story signal" : "story signals"}</p>
        {signalCount > 0 ? <p>{historyUnavailable ? "Read status unavailable. Choose a light to preview its story." : "Choose a light to preview its story."}</p> : null}
      </div>
      <div ref={mapRef} className={isCrest ? `${styles.iceberg} ${styles.crestArt} ${styles.crestMap}` : styles.iceberg}>
        {!isCrest && showCategories ? (
          <ol id={categoryOverlayId} aria-label="Iceberg categories by depth" className={styles.categoryOverlay}>
            {monthlyIcebergCategoryBands.map(({ label, x, y, width }) => (
              <li key={label} style={{ left: `${x}%`, top: `${y}%`, "--band-width": `${width}%` } as CSSProperties}>
                {label}
              </li>
            ))}
          </ol>
        ) : null}
        {signals.map((signal) => {
          const read = readIds?.has(signal.id);
          const signalState = read ? "read" : read === false || readerId === null ? "unread" : undefined;

          return (
            <Fragment key={signal.id}>
              <button
                type="button"
                aria-label={`${signal.title} · ${signal.category}`}
                aria-description={signalState === "read" ? "Read" : signalState === "unread" ? "Unread" : undefined}
                aria-expanded={activeId === signal.id}
                aria-controls={activeId === signal.id ? previewId : undefined}
                data-story-preview
                data-signal-state={signalState}
                className={styles.marker}
                style={{
                  left: `${signal.x}%`,
                  top: `${signal.y}%`,
                  animationDelay: `-${(signal.x + signal.y) % 6}s`,
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && event.buttons === 0) {
                    cancelHover();
                    hoverTimer.current = setTimeout(() => {
                      setActiveId((currentId) => currentId ?? signal.id);
                    }, 120);
                  }
                }}
                onPointerLeave={cancelHover}
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
                  data-below={signal.y < (isCrest ? 33 : 18) ? "true" : undefined}
                  data-near-base={isCrest && signal.y > 76 ? "true" : undefined}
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
          );
        })}
        {!signalCount ? (
          <p className={styles.empty}>{isCrest ? "No stories in this time range." : "No stories on the iceberg for this month."}</p>
        ) : null}
      </div>
      {signalCount > 0 || !isCrest ? (
        <footer className={styles.footer} data-category-switch={!isCrest || undefined}>
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
          {!isCrest ? (
            <button
              type="button"
              role="switch"
              aria-checked={showCategories}
              aria-controls={showCategories ? categoryOverlayId : undefined}
              className={styles.categorySwitch}
              onClick={() => setShowCategories((visible) => !visible)}
            >
              Categories
              <span aria-hidden="true" />
            </button>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}
