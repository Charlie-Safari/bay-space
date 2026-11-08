"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { baySpaceHowToOpenEvent } from "../components/mountain-time-footer";
import { howToTopics } from "./how-to-content";
import styles from "./library-how-to.module.css";

export default function LibraryHowTo() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const guideRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let scrollFrame = 0;

    function openGuide() {
      setIsOpen(true);
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => {
        guideRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      });
    }

    function openFromHash() {
      if (window.location.hash === "#how-to") openGuide();
    }

    openFromHash();
    window.addEventListener(baySpaceHowToOpenEvent, openGuide);
    window.addEventListener("hashchange", openFromHash);

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener(baySpaceHowToOpenEvent, openGuide);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const total = howToTopics.length;
    const destinations = {
      ArrowLeft: (index - 1 + total) % total,
      ArrowRight: (index + 1) % total,
      Home: 0,
      End: total - 1,
    };
    const nextIndex = destinations[event.key as keyof typeof destinations];
    if (nextIndex === undefined) return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section
      ref={guideRef}
      id="how-to"
      className={styles.guide}
      aria-labelledby="how-to-title"
    >
      <h2>
        <button
          type="button"
          className={styles.launcher}
          aria-labelledby="how-to-title"
          aria-describedby="how-to-description"
          aria-expanded={isOpen}
          aria-controls="how-to-guide"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={styles.launcherCopy}>
            <span className={styles.eyebrow}>Bay Space Field Guide</span>
            <span id="how-to-title" className={styles.title}>How To</span>
            <span id="how-to-description" className={styles.description}>
              Find your way from your first read to your first post.
            </span>
          </span>
          <span className={styles.toggle} aria-hidden="true">{isOpen ? "−" : "+"}</span>
        </button>
      </h2>

      <div id="how-to-guide" className={styles.body} hidden={!isOpen}>
        <div className={styles.tabs} role="tablist" aria-label="How To topics">
          {howToTopics.map((topic, index) => (
            <button
              key={topic.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              id={`how-to-tab-${topic.id}`}
              aria-controls={`how-to-panel-${topic.id}`}
              aria-selected={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleTabKey(event, index)}
              className={styles.tab}
            >
              <span className={styles.tabNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{topic.label}</span>
            </button>
          ))}
        </div>

        {howToTopics.map((topic) => (
          <div
            key={topic.id}
            id={`how-to-panel-${topic.id}`}
            role="tabpanel"
            aria-labelledby={`how-to-tab-${topic.id}`}
            tabIndex={0}
            hidden={topic !== howToTopics[activeIndex]}
            className={styles.panel}
          >
            <h3 className={styles.topicTitle}>{topic.label}</h3>
            <p className={styles.intro}>{topic.intro}</p>
            <div className={styles.groups}>
              {topic.groups.map((group) => (
                <div key={group.title} className={styles.group}>
                  <h4>{group.title}</h4>
                  <dl>
                    {group.entries.map((entry) => (
                      <div key={entry.label} className={styles.entry}>
                        <dt>{entry.label}</dt>
                        <dd>{entry.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            {topic.links?.length ? (
              <div className={styles.links}>
                {topic.links.map((link) => (
                  <Link key={link.href} href={link.href} className={styles.link}>
                    {link.label}<span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
