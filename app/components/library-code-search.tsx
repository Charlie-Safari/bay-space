"use client";

import { useEffect, useState } from "react";
import DosCodeBox from "./dos-code-box";
import { BayPost, getBayPosts, normalizeShelfLabel } from "./post-store";

const libraryCodes: Record<string, string> = {
  "safari1": "/library/admin-index",
};

export default function LibraryCodeSearch() {
  const [posts, setPosts] = useState<BayPost[]>([]);

  useEffect(() => {
    getBayPosts().then(setPosts);
  }, []);

  function openCode(nextCode: string) {
    const normalizedCode = normalizeShelfLabel(nextCode);
    const href = libraryCodes[normalizedCode];

    if (href) {
      window.location.href = href;
      return;
    }

    const matchingPost = posts.find(
      (post) => post.shelfCode === normalizedCode,
    );

    if (matchingPost) {
      window.location.hash = `library-${matchingPost.id}`;
    }
  }

  return (
    <DosCodeBox
      ariaLabel="Open shelf label"
      autoFocus
      id="library-code"
      label="shelf label"
      maxLength={120}
      onSubmitCode={openCode}
      shouldSubmitCode={(nextCode) => {
        const normalizedCode = normalizeShelfLabel(nextCode);

        return (
          normalizedCode in libraryCodes ||
          posts.some((post) => post.shelfCode === normalizedCode)
        );
      }}
    />
  );
}
