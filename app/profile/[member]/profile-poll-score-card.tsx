import type { BayPollStats } from "../../../lib/bay-space-polls";
import type { QuizStats } from "../../../lib/bay-space-quizzes";
import styles from "./profile.module.css";

export default function ProfilePollScoreCard({ stats, quizStats }: { stats: BayPollStats; quizStats: QuizStats | null }) {
  const rows = [
    ["Polls voted", stats.voted],
    ["Outcomes won", stats.won],
    ["Outcomes lost", stats.lost],
    ["Ties / refunds", stats.refunded],
    ["Accuracy", `${stats.accuracy}%`],
    ["Poll points won", stats.pointsWon],
    ["Poll points lost", stats.pointsLost],
    ["Net Poll score", stats.netPoints],
    ["Winning streak", stats.currentStreak],
    ["Polls authored", stats.authored],
  ];

  return (
    <details className={`${styles.disclosure} mt-6`}>
      <summary className={styles.summary}>
        <span>Score Card</span>
        <span aria-hidden="true" className={styles.chevron}>▾</span>
      </summary>
      <div className={styles.disclosureBody}>
      <h2 className={styles.sectionTitle}>Polls</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#72c16a]/20 bg-black/35 px-4 py-3">
            <dt className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[#789274]">{label}</dt>
            <dd className="mt-2 text-lg font-black text-[#cde0ca]">
              {typeof value === "number" ? value.toLocaleString("en-US") : value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 border-t border-[#72c16a]/20 pt-5">
        <h2 className={styles.sectionTitle}>Weekly Quiz</h2>
        {quizStats ? (
          <>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Quizzes completed", quizStats.completed],
                ["Correct", `${quizStats.correctPercent}%`],
                ["Incorrect", `${quizStats.incorrectPercent}%`],
                ["Confidence score", `${quizStats.confidence}%`],
                ["Quiz points earned", quizStats.points],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#72c16a]/20 bg-black/35 px-4 py-3">
                  <dt className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[#789274]">{label}</dt>
                  <dd className="mt-2 text-lg font-black text-[#cde0ca]">{typeof value === "number" ? value.toLocaleString("en-US") : value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-5 text-[#9abc96]">First submissions only. Confidence reflects accuracy and the number of questions answered; practice does not affect the score.</p>
          </>
        ) : <p className="mt-3 text-sm text-[#9abc96]">Coming soon</p>}
      </div>
      </div>
    </details>
  );
}
