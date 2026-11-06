import { getCurrentMember } from "../../../lib/bay-space-session";
import { canAuthorQuizzes, getWeeklyQuiz, getQuizAttempt, getQuizSources, publishQuiz } from "../../../lib/bay-space-quizzes";
import { getQuizWeek } from "../../../lib/bay-space-quiz-format";

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) return Response.json({ message: "Sign in to take the weekly quiz." }, { status: 401 });
    const quiz = await getWeeklyQuiz();
    const attempt = quiz ? await getQuizAttempt(quiz.id, member.member) : null;
    const canAuthor = canAuthorQuizzes(member);
    return Response.json({
      week: getQuizWeek(), canAuthor, attempt,
      sources: canAuthor && !quiz ? await getQuizSources() : [],
      quiz: quiz ? { id: quiz.id, title: quiz.title, weekStart: quiz.week_start, questions: quiz.questions.map(({ correctIndex, explanation, ...question }) => ({ ...question, ...(attempt ? { correctIndex, explanation } : {}) })) } : null,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "The weekly quiz is not available yet. Please try again shortly." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();
    if (!member) return Response.json({ message: "Sign in required." }, { status: 401 });
    if (!canAuthorQuizzes(member)) return Response.json({ message: "Quiz authorship locked." }, { status: 403 });
    const id = await publishQuiz(member, await request.json());
    return Response.json({ id });
  } catch (error) {
    console.error(error);
    return Response.json({ message: error instanceof Error ? error.message : "Unable to publish quiz." }, { status: 400 });
  }
}
