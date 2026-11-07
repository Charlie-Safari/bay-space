import type { ReactNode } from "react";
import styles from "./crypti.module.css";

export default function CryptiLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>{children}</div>
    </main>
  );
}
