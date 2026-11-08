import { getCurrentMember } from "../../../lib/bay-space-session";
import { canAuthorQuizzes, getWeeklyQuiz, getQuizAttempt } from "../../../lib/bay-space-quizzes";
import { getQuizWeek } from "../../../lib/bay-space-quiz-format";
import { canUsePosterParticipation } from "../../../lib/bay-space-roles";
import { getBayPointMultiplier } from "../../../lib/bay-space-ranks";

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) return Response.json({ message: "Sign in to take the weekly quiz." }, { status: 401 });
    const canTake = canUsePosterParticipation(member);
    const quiz = canTake ? await getWeeklyQuiz() : null;
    const attempt = quiz ? await getQuizAttempt(quiz.id, member.member) : null;
    const canAuthor = canAuthorQuizzes(member);
    return Response.json({
      week: getQuizWeek(), canAuthor, canTake, attempt,
      pointsPerAnswer: 50 * getBayPointMultiplier(member.rank),
      quiz: quiz ? { id: quiz.id, title: quiz.title, weekStart: quiz.week_start, questions: quiz.questions.map(question => question === null ? null : (() => { const { correctIndex, explanation, ...publicQuestion } = question; return { ...publicQuestion, ...(attempt ? { correctIndex, explanation } : {}) }; })()) } : null,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "The weekly quiz is not available yet. Please try again shortly." }, { status: 503 });
  }
}
