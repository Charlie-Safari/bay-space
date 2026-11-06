import Image from "next/image";
import styles from "./matrix-loading-screen.module.css";

type MatrixLoadingScreenProps = {
  label?: string;
  title?: string;
};

const matrixColumns = [
  "010011010101101001001101",
  "101100101011001010110010",
  "001011010010110100101101",
  "110010101100101011001010",
  "010110010101100101011001",
  "101001101010011010100110",
  "011010010110100101101001",
  "100101101001011010010110",
  "001101010011010100110101",
  "110100101101001011010010",
  "010010110100101101001011",
  "101101001011010010110100",
];

export default function MatrixLoadingScreen({
  label = "c:\\bay-space\\matrix> routing",
  title = "Bay Space",
}: MatrixLoadingScreenProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={styles.screen}
      role="status"
    >
      <div className={styles.matrixField} aria-hidden="true">
        {matrixColumns.map((column, index) => (
          <span
            key={`${column}-${index}`}
            style={{
              animationDelay: `${(index % 4) * -0.28}s`,
              animationDuration: `${1.15 + (index % 5) * 0.16}s`,
            }}
          >
            {column}
          </span>
        ))}
      </div>

      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.scanlines} aria-hidden="true" />

      <div className={styles.centerpiece}>
        <div className={styles.logoFrame}>
          <Image
            src="/global-logo-bay-space.png"
            alt=""
            width={1748}
            height={1766}
            priority
            className={styles.logo}
          />
        </div>

        <div className={styles.copy}>
          <p className={styles.path}>{label}</p>
          <p className={styles.destination}>{title}</p>
          <div className={styles.progress} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
