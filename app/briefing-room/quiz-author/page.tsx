import HomeBar from "../../components/home-bar";
import { getCurrentMember } from "../../../lib/bay-space-session";
import { canAuthorQuizzes } from "../../../lib/bay-space-quizzes";
import QuizAuthorForm from "./quiz-author-form";
import styles from "../briefing-room.module.css";

export default async function QuizAuthorPage() {
  const member = await getCurrentMember();
  return <main className={`${styles.page} min-h-screen text-[#72c16a] font-mono`}>
    <HomeBar />
    <section className={`${styles.content} mx-auto w-full max-w-6xl px-4 py-16`}>
      <p className={`${styles.breadcrumb} mb-4 uppercase`}>c:\bay-space\briefing-room\quiz-author</p>
      {member && canAuthorQuizzes(member) ? <QuizAuthorForm memberNumber={Number(member.member)} /> : <>
        <a href="/briefing-room?panel=quiz" className="mb-8 inline-block rounded-full border border-[#72c16a80] px-5 py-3">← Back to Quiz</a>
        <p>Quiz authorship requires the Impossible badge.</p>
      </>}
    </section>
  </main>;
}
