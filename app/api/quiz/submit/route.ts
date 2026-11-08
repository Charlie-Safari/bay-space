import { revalidatePath } from "next/cache";
import { getCurrentMember } from "../../../../lib/bay-space-session";
import { getWeeklyQuiz, gradeQuiz } from "../../../../lib/bay-space-quizzes";
import { recordWeeklyQuizReward } from "../../../../lib/bay-space-db";
import { canUsePosterParticipation } from "../../../../lib/bay-space-roles";

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();
    if (!member) return Response.json({ message: "Sign in required." }, { status: 401 });
    if (!canUsePosterParticipation(member)) {
      return Response.json({ message: "The weekly quiz unlocks at Poster I." }, { status: 403 });
    }
    const body = await request.json() as { quizId?: unknown; answers?: unknown };
    const quiz = await getWeeklyQuiz();
    if (!quiz || body.quizId !== quiz.id) return Response.json({ message: "This weekly quiz has closed. Open the current quiz." }, { status: 409 });
    const correct = gradeQuiz(quiz.questions, body.answers);
    const reward = await recordWeeklyQuizReward(member.member, quiz.id, body.answers as number[], correct * 50);
    revalidatePath(`/profile/${member.member}`);
    return Response.json({ correct, total: quiz.questions.length, ...reward, questions: quiz.questions });
  } catch (error) {
    console.error(error);
    return Response.json({ message: error instanceof Error ? error.message : "Unable to submit quiz." }, { status: 400 });
  }
}
