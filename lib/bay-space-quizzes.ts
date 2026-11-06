import { supabaseRequest } from "./supabase/server";
import type { BayMember } from "./bay-space-types";
import { getQuizWeek, quizDateStart, validateQuizDraft, type QuizQuestion } from "./bay-space-quiz-format";

export type QuizRow = { id: string; title: string; week_start: string; questions: QuizQuestion[] };
export type QuizAttempt = { correct_count: number; question_count: number; points_awarded: number; promotion_bonus: number; answers: number[] };
export type QuizStats = { completed: number; correctPercent: number; incorrectPercent: number; confidence: number; points: number };

export function canAuthorQuizzes(member: BayMember | null) {
  return Boolean(member?.gateKeys.includes("impossible-badge"));
}

export async function getWeeklyQuiz() {
  const rows = await supabaseRequest<QuizRow[]>("weekly_quizzes", { query: { week_start: `eq.${getQuizWeek().weekStart}`, select: "id,title,week_start,questions", limit: 1 } });
  return rows[0] ?? null;
}

export async function getQuizAttempt(quizId: string, member: string) {
  const rows = await supabaseRequest<QuizAttempt[]>("weekly_quiz_attempts", { query: { quiz_id: `eq.${quizId}`, member_number: `eq.${Number(member)}`, select: "correct_count,question_count,points_awarded,promotion_bonus,answers", limit: 1 } });
  return rows[0] ?? null;
}

export async function getQuizSources() {
  const { sourceStart, weekStart } = getQuizWeek();
  return supabaseRequest<{ id: string; title: string; created_at: string }[]>("posts", { query: { select: "id,title,created_at", category: "eq.daily-food", incognito: "eq.false", moderation_status: "eq.active", deleted_at: "is.null", and: `(created_at.gte.${quizDateStart(sourceStart)},created_at.lt.${quizDateStart(weekStart)})`, order: "created_at.desc" } });
}

export async function publishQuiz(member: BayMember, body: unknown) {
  const draft = validateQuizDraft(body);
  return supabaseRequest<string>("rpc/create_weekly_quiz", { method: "POST", body: { p_member_number: Number(member.member), p_title: draft.title, p_week_start: draft.weekStart, p_questions: draft.questions } });
}

export function gradeQuiz(questions: QuizQuestion[], answers: unknown): number {
  if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((answer, index) => !Number.isInteger(answer) || answer < 0 || answer >= questions[index].options.length)) throw new Error("Answer every question before submitting.");
  return answers.reduce((total, answer, index) => total + Number(answer === questions[index].correctIndex), 0);
}

export async function getQuizStats(member: string): Promise<QuizStats | null> {
  try {
    const rows = await supabaseRequest<QuizAttempt[]>("weekly_quiz_attempts", { query: { member_number: `eq.${Number(member)}`, select: "correct_count,question_count,points_awarded" } });
    const correct = rows.reduce((sum, row) => sum + row.correct_count, 0);
    const total = rows.reduce((sum, row) => sum + row.question_count, 0);
    const proportion = total ? correct / total : 0;
    // Wilson lower bound: confidence grows with both accuracy and completed questions.
    const z = 1.96;
    const confidence = total ? Math.max(0, (proportion + z*z/(2*total) - z*Math.sqrt((proportion*(1-proportion)+z*z/(4*total))/total))/(1+z*z/total)) : 0;
    const correctPercent = Math.round(proportion * 1000) / 10;
    return { completed: rows.length, correctPercent, incorrectPercent: total ? Math.round((100-correctPercent)*10)/10 : 0, confidence: Math.round(confidence*1000)/10, points: rows.reduce((sum, row) => sum + row.points_awarded, 0) };
  } catch (error) {
    if (error instanceof Error && /weekly_quiz_attempts.*(schema cache|does not exist)/i.test(error.message)) return null;
    throw error;
  }
}
