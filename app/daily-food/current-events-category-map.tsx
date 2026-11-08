"use client";

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import icebergStyles from "../theories/monthly-iceberg-map.module.css";
import { crestCategoryLayout } from "./crest-layout";
import styles from "./current-events-category-map.module.css";

const categoryIcons: Record<string, string> = {
  "Contact Readiness": "M3 13c2-3 5-4 9-4s7 1 9 4c-3 3-15 3-18 0Zm4-3a5 5 0 0 1 10 0m-9 8-2 3m6-3v3m4-3 2 3",
  "AI Emergence": "M6 6h12v12H6zm3 3h6v6H9zM9 3v3m6-3v3m3 3h3m-3 6h3m-6 3v3m-6-3v3m-6-6h3M3 9h3",
  "Space Capability": "M8 20a8 8 0 1 0-4-10m2 7c-1-2 2-6 7-9s9-4 9-2-3 6-8 9-8 4-8 2ZM4 4v4M2 6h4",
  "Nuclear Posture": "M21 12c0 2-4 3-9 3s-9-1-9-3 4-3 9-3 9 1 9 3ZM7 4c2-1 5 2 8 6s4 8 2 9-5-2-8-6-4-8-2-9Zm10 0c2 1 1 5-2 9s-6 7-8 6-1-5 2-9 6-7 8-6Zm-5 8h.01",
  "Technology Leap Risk": "M9 15c1-6 4-10 11-11-1 7-5 10-11 11Zm0 0-3-1-2 2m5-1 1 3-2 2m-4 1 3-3m8-9h.01",
  "Conflict Intensity": "m4 4 5 2 11 11-3 3L6 9 4 4Zm16 0-5 2-3 3m-2 5-6 6m1-4 3 3m8-1 3-3",
  "Survival Status": "M12 3c-2 2-5 3-8 3 0 7 3 12 8 15 5-3 8-8 8-15-3 0-6-1-8-3Zm0 5v7m-3-3h6",
  "Signal Output": "M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 4-4 9m4-9 4 9m-6-4h4M7 5a7 7 0 0 0 0 10m10-10a7 7 0 0 1 0 10M4 3a10 10 0 0 0 0 14M20 3a10 10 0 0 1 0 14",
  "Climate Stability": "M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Zm2-3v7m0 0h.01",
  "Extinction Proximity": "M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-4 1A4 4 0 0 1 9 3m7 8a4 4 0 0 0-1-8m-7 8a4 4 0 0 0-4 6m6-1a4 4 0 0 1-5 5m11-10a4 4 0 0 1 4 6m-6-1a4 4 0 0 0 5 5",
  "Biosphere Health": "M12 20v-7m0 2C5 15 3 11 3 6c5 0 9 2 9 8Zm0-2c0-5 3-8 9-8 0 6-4 8-9 8Z",
  "Psychological Volatility": "M12 5c-2-3-6-1-6 2-3 1-4 5-2 7-1 4 4 6 6 4 1 2 2 2 2 1 0 1 1 1 2-1 2 2 7 0 6-4 2-2 1-6-2-7 0-3-4-5-6-2Zm0 0v14m-6-9c1-1 3-1 4 1m8-1c-1-1-3-1-4 1",
  "Governance Coherence": "M3 8h18L12 3 3 8Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18M4 18h16",
  "Resource Burn Rate": "M4 6c0-2 4-3 8-3s8 1 8 3-4 3-8 3-8-1-8-3Zm0 0v12c0 2 4 3 8 3s8-1 8-3V6M4 12c0 2 4 3 8 3s8-1 8-3",
  "Observation Priority": "M3 16 6 7h4l1 9m2 0 1-9h4l3 9m-10 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm10 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-10-4h2",
  "Containment Risk": "M7 10V7a5 5 0 0 1 10 0v3m-12 0h14v11H5zm7 4v3",
  "Misc": "M5 12h.01m7 0h.01m7 0h.01",
};

function getConnectorPoints(entry: (typeof crestCategoryLayout)[number]) {
  const { anchor, label, connectorSide } = entry;

  if (connectorSide === "bottom") {
    const startY = label.y + 4;
    const kneeY = startY + (anchor.y - startY) * 0.48;
    return `${label.x},${startY} ${label.x},${kneeY} ${anchor.x},${anchor.y}`;
  }

  const direction = connectorSide === "right" ? 1 : -1;
  const edgeX = label.x + direction * label.width / 2;
  const kneeX = edgeX + (anchor.x - edgeX) * 0.38;
  return `${edgeX},${label.y} ${kneeX},${label.y} ${anchor.x},${anchor.y}`;
}

export default function CurrentEventsCategoryMap({
  onSelectCategory,
}: {
  onSelectCategory: (category: string) => void;
}) {
  const mapRef = useRef<HTMLElement>(null);
  const previewId = useId();
  const [preview, setPreview] = useState<{ category: string; pressed: boolean } | null>(null);

  useEffect(() => {
    if (!preview) return;

    function dismissOutside(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && mapRef.current?.contains(target) &&
          target.closest("[data-category-preview]")) return;
      setPreview(null);
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }

    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [preview]);

  return (
    <section ref={mapRef} aria-label="Current Events category map" className={styles.map}>
      <div className={`${styles.mountain} ${icebergStyles.crestArt}`}>
        <span className={styles.caption} aria-hidden="true">Current Events Categories</span>
        <svg className={styles.connectors} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {crestCategoryLayout.map((entry) => (
            <polyline key={entry.category} points={getConnectorPoints(entry)} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {crestCategoryLayout.map(({ category, anchor }, index) => {
          const active = preview?.category === category;

          return (
            <Fragment key={category}>
              <button
                type="button"
                className={styles.beacon}
                data-category-preview
                style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
                aria-label={`Preview category ${index + 1}: ${category}`}
                aria-expanded={active}
                aria-controls={active ? previewId : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && event.buttons === 0) {
                    setPreview((current) => current?.pressed ? current : { category, pressed: false });
                  }
                }}
                onClick={() => {
                  if (active && preview.pressed) onSelectCategory(category);
                  else setPreview({ category, pressed: true });
                }}
              >
                <span aria-hidden="true">{index + 1}</span>
              </button>
              {active ? (
                <button
                  id={previewId}
                  type="button"
                  data-category-preview
                  className={styles.preview}
                  data-below={anchor.y < 35 || undefined}
                  style={{ "--anchor-x": `${anchor.x}%`, top: `${anchor.y}%` } as CSSProperties}
                  aria-label={`Open category: ${category}`}
                  onClick={() => onSelectCategory(category)}
                >
                  {category}
                </button>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      <ul className={styles.tabs}>
        {crestCategoryLayout.map(({ category, label }, index) => (
          <li
            key={category}
            style={{ "--tab-x": `${label.x}%`, "--tab-y": `${label.y}%`, "--tab-width": `${label.width}%` } as CSSProperties}
          >
            <button className={styles.tab} type="button" onClick={() => onSelectCategory(category)}>
              <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                <path d={categoryIcons[category]} />
              </svg>
              <span className={styles.index} aria-hidden="true">{index + 1}</span>
              <span className={styles.label}>{category}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
