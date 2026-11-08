// Run: node scripts/check-weekly-quiz.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
if (!process.argv[2]) throw new Error('Pass the path to a temporary PGlite installation; this test never uses Supabase.');
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
import fs from 'node:fs';
import assert from 'node:assert/strict';

function loadTs(path, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(compiled, {exports, require: name => mocks[name] ?? require(name), Intl, Date, console, Response});
  return exports;
}
const format = loadTs('../lib/bay-space-quiz-format.ts');
assert.equal(format.getQuizWeek(new Date('2026-11-02T07:58:59Z')).weekStart, '2026-10-26');
assert.equal(format.getQuizWeek(new Date('2026-11-02T07:59:00Z')).weekStart, '2026-11-02');
assert.equal(format.getQuizWeek(new Date('2026-11-02T08:00:00Z')).weekStart, '2026-11-02');
assert.equal(format.getQuizWeek(new Date('2027-01-01T18:00:00Z')).sourceStart, '2026-12-21');
assert.equal((Date.parse(format.quizDateStart('2026-11-02'))-Date.parse(format.quizDateStart('2026-10-26')))/3600000,169);
assert.equal((Date.parse(format.quizDateStart('2026-03-09'))-Date.parse(format.quizDateStart('2026-03-02')))/3600000,167);
const exchange = loadTs('../app/briefing-room/exchange-conversion.tsx', {'./briefing-room.module.css': {}});
for (const [input, rate, expected] of [['',100,0],['49',100,0],['149',100,100],['150',100,200],['251',100,300],['2',5,0],['3',5,5],['12',5,10],['13',5,15]]) assert.equal(exchange.roundExchangeAmount(input, rate), expected);
console.log('PASS: Pacific weekly boundaries, DST, year boundary, exchange rounding.');

const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create table members(id uuid primary key default gen_random_uuid(),member_number integer unique,deleted_at timestamptz,gate_keys jsonb default '[]',available_points bigint default 0,lifetime_points bigint default 0,rank text default 'reader',crypti_rank text default '',updated_at timestamptz default now());
create table posts(id uuid primary key default gen_random_uuid(),category text,deleted_at timestamptz,incognito boolean default false,moderation_status text default 'active',created_at timestamptz default now());`);
await db.exec(fs.readFileSync(new URL('../supabase/migrations/202611060001_weekly_quiz.sql', import.meta.url),'utf8'));
await db.exec(`insert into members(member_number,gate_keys) values (91001,'["impossible-badge"]'),(91002,'[]'),(91003,'[]'),(91004,'[]');`);
const {rows:[{week}]}=await db.query("select date_trunc('week',now() at time zone 'America/Los_Angeles')::date::text as week");
const {rows:[{id:post}]}=await db.query("insert into posts(category,created_at) values ('daily-food', (date_trunc('week',now() at time zone 'America/Los_Angeles') - interval '2 days') at time zone 'America/Los_Angeles') returning id");
const questions=Array.from({length:36},(_,i)=>({question:'Question '+i,options:['A','B','C'],correctIndex:1,explanation:'Source explanation',postId:post}));
format.validateQuizDraft({title:'Weekly quiz',weekStart:week,questions});
assert.throws(() => format.validateQuizDraft({title:'Quiz',weekStart:week,questions:questions.slice(1)}), /36/);
assert.throws(() => format.validateQuizDraft({title:'Quiz',weekStart:week,questions:questions.map(q=>({...q,options:['same','same']}))}), /different/);
const create=(member,qs=questions)=>db.query('select create_weekly_quiz($1,$2,$3,$4) as id',[member,'Weekly quiz',week,JSON.stringify(qs)]);
const {rows:[{id:oldPost}]}=await db.query("insert into posts(category,created_at) values ('daily-food', now() - interval '30 days') returning id");
await assert.rejects(create(91001,questions.map(q=>({...q,postId:oldPost}))),/last week/);
await db.query('update posts set incognito=true where id=$1',[post]);
await assert.rejects(create(91001),/public Current Events/);
await db.query('update posts set incognito=false where id=$1',[post]);
await assert.rejects(create(91002),/locked/);
await assert.rejects(create(91001,questions.slice(1)),/36/);
await assert.rejects(create(91001,questions.map(q=>({...q,correctIndex:3}))),/correct answer/);
const {rows:[{id:quiz}]}=await create(91001);
await assert.rejects(create(91001),/unique/);
const expected={available_points:0,lifetime_points:0,rank:'reader',crypti_rank:'',gate_keys:[]};
const award={available_points:1900,lifetime_points:1900,rank:'reader-ii',crypti_rank:''};
const submit=(member,answers,exp=expected,aw=award)=>db.query('select submit_weekly_quiz($1,$2,$3,$4,$5) as result',[member,quiz,JSON.stringify(answers),JSON.stringify(exp),JSON.stringify(aw)]).then(r=>r.rows[0].result);
const answers=Array(36).fill(1);
await assert.rejects(submit(91002,answers.slice(1)),/36/);
assert.deepEqual(await submit(91002,answers),{claimed:true,points:1800,promotionBonus:100});
const repeat=await Promise.all([submit(91002,answers),submit(91002,answers)]);
for(const r of repeat)assert.equal(r.points,0);
const {rows:[member]}=await db.query('select available_points,lifetime_points,rank from members where member_number=91002');
assert.equal(Number(member.available_points),1900);assert.equal(Number(member.lifetime_points),1900);assert.equal(member.rank,'reader-ii');
assert.equal((await db.query('select count(*)::int as n from weekly_quiz_attempts where member_number=91002')).rows[0].n,1);
await db.query('update members set available_points=10 where member_number=91003');
assert.equal((await submit(91003,answers)).retry,true);
assert.equal((await db.query('select count(*)::int as n from weekly_quiz_attempts where member_number=91003')).rows[0].n,0);
assert.deepEqual(await submit(91004,Array(36).fill(0),expected,{...award,available_points:0,lifetime_points:0,rank:'reader'}),{claimed:true,points:0,promotionBonus:0});
await db.exec('set role anon');
await assert.rejects(db.query('select * from weekly_quizzes'),/permission denied/);
await assert.rejects(db.query('select submit_weekly_quiz(91002,null,null,null,null)'),/permission denied/);
await db.exec('reset role');
await db.query("update weekly_quizzes set week_start=week_start - 7 where id=$1",[quiz]);
await assert.rejects(submit(91003,answers),/closed/);
await db.exec(fs.readFileSync(new URL('../supabase/migrations/202611060001_weekly_quiz.sql', import.meta.url),'utf8'));
console.log('PASS: migration and rerun, authorship, validation, reward + promotion, duplicate/concurrent retries, stale-balance retry, zero score, anonymous restrictions, weekly close.');
const quizHelpers = loadTs('../lib/bay-space-quizzes.ts', {'./supabase/server': {}, './bay-space-quiz-format': format});
assert.equal(quizHelpers.gradeQuiz(questions, Array(36).fill(1)), 36);
assert.equal(quizHelpers.gradeQuiz(questions, Array(36).fill(0)), 0);
assert.equal(quizHelpers.gradeQuiz(questions, [...Array(12).fill(1),...Array(24).fill(0)]) * 50, 600);
assert.throws(() => quizHelpers.gradeQuiz(questions, Array(35).fill(1)), /every filled question/);
assert.throws(() => quizHelpers.gradeQuiz(questions, Array(36).fill(4)), /every filled question/);
assert.equal(quizHelpers.gradeQuiz([questions[0], ...Array(35).fill(null)], [1, ...Array(35).fill(-1)]), 36);
let viewer = null;
let attempt = null;
const ranks = loadTs('../lib/bay-space-ranks.ts');
const roles = loadTs('../lib/bay-space-roles.ts', {
  './bay-space-ranks': ranks,
  './bay-space-agreement': {},
});
const route = loadTs('../app/api/quiz/route.ts', {
  '../../../lib/bay-space-session': {getCurrentMember: async () => viewer},
  '../../../lib/bay-space-quiz-format': format,
  '../../../lib/bay-space-ranks': ranks,
  '../../../lib/bay-space-roles': roles,
  '../../../lib/bay-space-quizzes': {
    canAuthorQuizzes: member => Boolean(member?.gateKeys.includes('impossible-badge')),
    getWeeklyQuiz: async () => ({id: quiz, title:'Quiz',week_start:week,questions}),
    getQuizAttempt: async () => attempt,
  },
});
assert.equal((await route.GET()).status,401);
viewer = {member:'91002',gateKeys:[],rank:'reader'};
const lockedQuiz = await (await route.GET()).json();
assert.equal(lockedQuiz.canTake,false);
assert.equal(lockedQuiz.quiz,null);
viewer.rank = 'poster';
const publicQuiz = await (await route.GET()).json();
assert.equal(publicQuiz.canTake,true);
assert.equal(publicQuiz.pointsPerAnswer,50);
viewer.rank = 'poster-iii';
assert.equal((await (await route.GET()).json()).pointsPerAnswer,100);
assert.equal(publicQuiz.quiz.questions[0].correctIndex,undefined);
assert.equal(publicQuiz.quiz.questions[0].explanation,undefined);
attempt = {correct_count:36};
assert.equal((await (await route.GET()).json()).quiz.questions[0].correctIndex,1);
console.log('PASS: scoring, incomplete/invalid answers, sign-in and author gates, answer-key secrecy until completion.');

const sharedSql=fs.readFileSync(new URL('../supabase/migrations/202611060002_shared_weekly_quiz_draft.sql', import.meta.url),'utf8')
  .replace(/^create extension if not exists pg_cron;\s*$/gm,'')
  .replace(/^select cron\.schedule\([^\n]+;\s*$/gm,''); // PGlite does not bundle Supabase Cron.
await db.exec(sharedSql);
const {rows:[{id:currentPost}]}=await db.query("insert into posts(category,created_at) values ('daily-food', now()) returning id");
const currentQuestion={...questions[0],postId:currentPost};
const add=(action,position,question)=>db.query('select edit_weekly_quiz_draft($1,$2,$3,$4) as draft',[91001,action,position,question ? JSON.stringify(question) : null]).then(result=>result.rows[0].draft);
assert.equal((await add('append',null,currentQuestion)).position,1);
assert.equal((await add('append',null,{...currentQuestion,question:'Second question'})).position,2);
assert.equal((await add('delete',1,null)).questions.length,1);
assert.equal((await add('save',1,{...currentQuestion,question:'Edited second question'})).questions[0].question,'Edited second question');
await assert.rejects(db.query('select edit_weekly_quiz_draft($1,$2,$3,$4)',[91002,'append',null,JSON.stringify(currentQuestion)]),/locked/);
// Simulate the Sunday cutoff by moving the draft into the newly active week.
await db.query('update weekly_quiz_drafts set week_start=quiz_active_week() where week_start=quiz_active_week()+7');
const {rows:[{id:published}]}=await db.query('select publish_due_weekly_quiz() as id');
const {rows:[{questions:publishedQuestions}]}=await db.query('select questions from weekly_quizzes where id=$1',[published]);
assert.equal(publishedQuestions.length,36); assert.equal(publishedQuestions[0].question,'Edited second question'); assert.equal(publishedQuestions[1],null);
assert.equal((await db.query('select count(*)::int as n from weekly_quiz_drafts where week_start=quiz_active_week()')).rows[0].n,0);
assert.equal(quizHelpers.gradeQuiz(publishedQuestions,[1,...Array(35).fill(-1)]),36);
const bonusAnswer=[1,...Array(35).fill(-1)];
const bonusClaim=await db.query('select submit_weekly_quiz($1,$2,$3,$4,$5) as result',[91004,published,JSON.stringify(bonusAnswer),JSON.stringify(expected),JSON.stringify({available_points:1800,lifetime_points:1800,rank:'reader',crypti_rank:''})]);
assert.equal(bonusClaim.rows[0].result.points,1800);
assert.equal((await db.query('select correct_count from weekly_quiz_attempts where quiz_id=$1 and member_number=91004',[published])).rows[0].correct_count,36);
console.log('PASS: shared author draft, direct append, edits, compacting deletion, auto publication and blank-slot bonus.');

// Keep a pre-migration question and verify it cannot be claimed by either author.
await add('append', null, currentQuestion);
await db.exec("insert into members(member_number,gate_keys) values (91005,'[\"impossible-badge\"]')");
await db.exec(fs.readFileSync(new URL('../supabase/migrations/202611070003_weekly_quiz_question_ownership.sql', import.meta.url), 'utf8'));
const {rows:[{questions: legacy}]} = await db.query('select questions from weekly_quiz_drafts where week_start=quiz_active_week()+7');
assert.ok(legacy[0].id);
assert.equal(legacy[0].authorMember, undefined);
const change = (author, action, id, question, week = null) => db.query(
  'select edit_owned_weekly_quiz_draft($1,$2,$3,$4,$5) as result',
  [author, action, id, question ? JSON.stringify(question) : null, week],
).then(r => r.rows[0].result);
await assert.rejects(change(91001, 'delete', legacy[0].id), /only the question author/i);
await assert.rejects(change(91005, 'save', legacy[0].id, currentQuestion), /only the question author/i);
const firstId = 'c0000000-0000-4000-8000-000000000001';
const first = await change(91001, 'append', firstId, {...currentQuestion, authorMember: 91005});
assert.equal(first.questions[1].authorMember, 91001);
assert.equal(first.questions[1].id, firstId);
assert.deepEqual(await change(91001, 'append', firstId, currentQuestion), first);
await assert.rejects(change(91005, 'append', firstId, currentQuestion), /ID is already in use/);
await assert.rejects(change(91005, 'save', firstId, currentQuestion), /only the question author/i);
await assert.rejects(change(91005, 'delete', firstId), /only the question author/i);
await assert.rejects(add('delete', 2, null), /reload the quiz editor/i);
await assert.rejects(change(91002, 'append', null, currentQuestion), /authorship locked/i);
await assert.rejects(change(91001, 'append', null, currentQuestion, '2026-01-05'), /quiz week changed/i);
const imported = await db.query('select import_owned_weekly_quiz_draft($1,$2,$3) as result', [
  91005, JSON.stringify([{...currentQuestion, question: 'Imported question'}]), first.weekStart,
]).then(r => r.rows[0].result);
const importedId = imported.questions[2].id;
assert.equal(imported.questions[2].authorMember, 91005);
assert.equal((await change(91001, 'delete', firstId)).questions[1].id, importedId);
assert.equal((await change(91005, 'save', importedId, {...currentQuestion, question: 'Edited after renumbering'})).questions[1].question, 'Edited after renumbering');
await assert.rejects(change(91001, 'delete', firstId), /no longer in the draft/i);

await db.exec('set role authenticated');
await assert.rejects(change(91001, 'append', null, currentQuestion), /permission denied/);
await db.exec('reset role');
await db.query('update weekly_quizzes set week_start=week_start-14 where id=$1', [published]);
await db.query('update weekly_quiz_drafts set week_start=quiz_active_week() where week_start=quiz_active_week()+7');
const {rows:[{id: ownedPublication}]} = await db.query('select publish_due_weekly_quiz() as id');
const {rows:[{questions: cleanPublication}]} = await db.query('select questions from weekly_quizzes where id=$1', [ownedPublication]);
assert.equal(cleanPublication.length, 36);
assert.equal(cleanPublication[1].question, 'Edited after renumbering');
assert.equal(cleanPublication[1].authorMember, undefined);
assert.equal(cleanPublication[1].id, undefined);
console.log('PASS: legacy read-only, automatic import attribution, owner-only edits/deletes, stable IDs, retry, cutoff and private ownership metadata.');
await db.close();
