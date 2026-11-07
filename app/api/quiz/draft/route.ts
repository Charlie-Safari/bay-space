import { getCurrentMember } from "../../../../lib/bay-space-session";
import { canAuthorQuizzes, editQuizDraft, getQuizDraft, getQuizSources, getWeeklyQuiz } from "../../../../lib/bay-space-quizzes";
import { supabaseRequest } from "../../../../lib/supabase/server";
import { getQuizWeek, validateQuizDraft } from "../../../../lib/bay-space-quiz-format";

async function author() {
  const member = await getCurrentMember();
  if (!member || !canAuthorQuizzes(member)) return null;
  return member;
}

export async function GET() {
  try {
    if (!await author()) return Response.json({ message: "Quiz authorship locked." }, { status: 403 });
    await getWeeklyQuiz();
    const [draft, sources] = await Promise.all([getQuizDraft(), getQuizSources()]);
    return Response.json({ ...draft, sources }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Quiz editor is unavailable. Check the Supabase migration." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const member = await author();
    if (!member) return Response.json({ message: "Quiz authorship locked." }, { status: 403 });
    const body = await request.json() as { action?: unknown; position?: unknown; question?: unknown; draft?: unknown; weekStart?: unknown };
    if (body.action === "import") {
      const draft = validateQuizDraft(body.draft);
      if (draft.weekStart !== getQuizWeek().draftWeekStart) return Response.json({ message: "The imported quiz must be for the upcoming quiz week." }, { status: 400 });
      const imported = await supabaseRequest<{ weekStart: string; questions: unknown[] }>("rpc/import_weekly_quiz_draft", { method: "POST", body: { p_member_number: Number(member.member), p_questions: draft.questions } });
      return Response.json(imported);
    }
    if (body.action !== "append" && body.action !== "save" && body.action !== "delete") return Response.json({ message: "Invalid draft action." }, { status: 400 });
    const position = body.position === null || body.position === undefined ? null : Number(body.position);
    if (position !== null && (!Number.isInteger(position) || position < 1 || position > 36)) return Response.json({ message: "Invalid question slot." }, { status: 400 });
    if (body.weekStart !== undefined && (typeof body.weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekStart))) return Response.json({ message: "Invalid quiz week." }, { status: 400 });
    const draft = await editQuizDraft(member, body.action, position, body.question, body.weekStart);
    return Response.json(draft);
  } catch (error) {
    console.error(error);
    return Response.json({ message: error instanceof Error ? error.message : "Unable to save quiz draft." }, { status: 400 });
  }
}
