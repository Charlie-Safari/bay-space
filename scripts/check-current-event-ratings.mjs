// Run with the path to a temporary @electric-sql/pglite/dist/index.js installation.
// Uses an isolated database. Never connects to Supabase.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
if (!process.argv[2]) throw new Error("Pass the path to a temporary PGlite installation.");
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const migration = fs.readFileSync("supabase/migrations/202611070001_current_event_rating_scales.sql", "utf8");
const lockMigration = fs.readFileSync("supabase/migrations/202611070002_lock_current_event_ratings.sql", "utf8");

await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create table members (
    id uuid primary key default gen_random_uuid(), member_number integer unique,
    deleted_at timestamptz, links jsonb default '{}', available_points bigint default 100,
    lifetime_points bigint default 100, rank text default 'reader', crypti_rank text default '',
    gate_keys jsonb default '[]', updated_at timestamptz default now()
  );
  create table posts (
    id uuid primary key default gen_random_uuid(), category text, deleted_at timestamptz,
    moderation_status text default 'active', author_member_id uuid,
    meta jsonb default '{}', updated_at timestamptz default now()
  );
  create table post_truth_votes (
    post_id uuid references posts(id), member_id uuid references members(id), score integer not null
      check (score between 0 and 11), point_value integer default 0,
    created_at timestamptz default now(), updated_at timestamptz default now(),
    primary key (post_id, member_id)
  );
  insert into members(member_number) values (91001), (91002), (91003);
  insert into posts(category, meta) values
    ('daily-food', '{"truthPointTenths":"20","truthVoteCount":"1","other":"keep"}'),
    ('top-story', '{"truthPointTenths":"10","truthVoteCount":"1"}'),
    ('theory', '{"truthPointTenths":"20","truthVoteCount":"1"}'),
    ('daily-food', '{"cryptiPost":"true","truthPointTenths":"20"}');
  insert into post_truth_votes(post_id, member_id, score, point_value)
    select p.id, m.id, 11, 2 from posts p cross join members m where m.member_number = 91001;
`);
await db.exec(migration);
await db.exec(lockMigration);
let rows = (await db.query("select category,meta from posts where coalesce(meta->>'cryptiPost','false') <> 'true' order by category")).rows;
assert.equal(rows.find(row => row.category === "daily-food").meta.truthPointTenths, "0");
assert.equal(rows.find(row => row.category === "top-story").meta.truthVoteCount, "0");
assert.equal(rows.find(row => row.category === "theory").meta.truthPointTenths, "20");
assert.equal(rows.find(row => row.category === "daily-food").meta.other, "keep");
assert.equal((await db.query("select score from post_truth_votes v join posts p on p.id=v.post_id where p.category='theory'")).rows[0].score, 11);

// Exercise the real storage helpers against a small REST-to-Postgres adapter.
async function supabaseRequest(table, options = {}) {
  const query = options.query ?? {};
  if (table === "rpc/set_current_event_rating") {
    const body = options.body;
    return (await db.query("select set_current_event_rating($1,$2,$3,$4,$5,$6) as result", [
      body.p_post_id, body.p_member_number, body.p_dimension, body.p_score,
      body.p_expected_updated_at, body.p_reward === null ? null : JSON.stringify(body.p_reward),
    ])).rows[0].result;
  }
  assert.equal(options.method ?? "GET", "GET");
  const filters = [];
  const values = [];
  for (const [column, value] of Object.entries(query)) {
    if (value === undefined || ["order", "select", "limit"].includes(column)) continue;
    assert.match(column, /^[a-z_]+$/);
    if (value === "is.null") filters.push(column + " is null");
    else {
      assert.match(String(value), /^(eq|gt)\./);
      values.push(String(value).slice(3));
      filters.push(column + (String(value).startsWith("gt.") ? " > $" : " = $") + values.length);
    }
  }
  assert.ok(["members", "posts", "post_truth_votes"].includes(table));
  const order = query.order === "member_id.asc" ? " order by member_id" : "";
  const limit = query.limit ? " limit " + Number(query.limit) : "";
  const result = await db.query("select to_jsonb(t) as row from " + table + " t where " + filters.join(" and ") + order + limit, values);
  return result.rows.map(row => row.row);
}
const moduleCache = new Map();
function loadTs(filename, mocks = {}) {
  filename = path.resolve(filename);
  if (moduleCache.has(filename)) return moduleCache.get(filename);
  const exports = {};
  moduleCache.set(filename, exports);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports, console, Intl, Date, Response, Request, setTimeout,
    require: name => {
      if (mocks[name]) return mocks[name];
      if (name.endsWith("/supabase/server")) return { supabaseRequest };
      if (name.startsWith(".")) return loadTs(path.resolve(path.dirname(filename), name + ".ts"));
      return require(name);
    },
  }, { filename });
  return exports;
}
const storage = loadTs("lib/bay-space-db.ts");
const postId = (await db.query("select id from posts where category='daily-food' and not meta ? 'cryptiPost'")).rows[0].id;
let summary = await storage.getPostTruthVoteSummary(postId, "91001");
assert.equal(summary.userScore, null);
assert.equal(summary.pointValue, 0);
assert.equal(summary.relevance.voteCount, 0);

for (const score of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
  summary = (await storage.setCurrentEventRating(postId, "91002", "truth", score)).summary;
  assert.equal(summary.userScore, score);
  assert.equal(summary.scoreTotal, score);
  assert.equal(summary.pointValue, score);
  if (score < 11) await storage.setCurrentEventRating(postId, "91002", "truth", 0);
}
assert.equal((await db.query("select available_points::int as points from members where member_number=91002")).rows[0].points, 125);
await Promise.all([
  storage.setCurrentEventRating(postId, "91002", "truth", 11),
  storage.setCurrentEventRating(postId, "91002", "relevance", 7),
  storage.setCurrentEventRating(postId, "91003", "truth", 3),
]);
summary = await storage.getPostTruthVoteSummary(postId, "91002");
assert.equal(summary.voteCount, 2);
assert.equal(summary.scoreTotal, 14);
assert.equal(summary.relevance.scoreTotal, 7);
assert.equal(summary.pointValue, 21);
assert.equal(summary.otherVoteCounts[2], 1);
assert.equal(summary.otherVoteCounts[10], 0);
assert.equal((await storage.getPostTruthVoteSummary(postId)).otherVoteCounts, undefined);
const changedVote = await storage.setCurrentEventRating(postId, "91002", "truth", 9);
assert.equal(changedVote.alreadyVoted, true);
assert.equal(changedVote.summary.userScore, 11);
assert.equal((await db.query("select meta->>'truthPointTenths' as points from posts where id=$1", [postId])).rows[0].points, "210");

await storage.setCurrentEventRating(postId, "91002", "truth", 0);
await storage.setCurrentEventRating(postId, "91002", "truth", 0);
summary = await storage.getPostTruthVoteSummary(postId, "91002");
assert.equal(summary.userScore, null);
assert.equal(summary.otherVoteCounts, undefined);
assert.equal(summary.voteCount, 1);
assert.equal(summary.relevance.userScore, 7);
assert.equal(summary.pointValue, 10);
assert.equal((await db.query("select available_points::int as points from members where member_number=91002")).rows[0].points, 100);
await storage.setCurrentEventRating(postId, "91002", "relevance", 0);
assert.equal((await storage.getPostTruthVoteSummary(postId)).relevance.voteCount, 0);

await db.exec(migration);
await db.exec(lockMigration);
assert.equal((await storage.getPostTruthVoteSummary(postId)).pointValue, 3);
const theoryId = (await db.query("select id from posts where category='theory'")).rows[0].id;
summary = await storage.getPostTruthVoteSummary(theoryId, "91001");
assert.equal(summary.userScore, 11);
assert.equal(summary.pointValue, 2);
assert.equal(summary.relevance, undefined);
assert.equal(await storage.setCurrentEventRating(theoryId, "91001", "relevance", 5), null);
await assert.rejects(storage.setCurrentEventRating(postId, "91001", "truth", 1.5), /Invalid/);
await assert.rejects(storage.setCurrentEventRating(postId, "91001", "truth", 12), /Invalid/);
const stale = await supabaseRequest("rpc/set_current_event_rating", { body: {
  p_post_id: postId, p_member_number: 91002, p_dimension: "truth", p_score: 8,
  p_expected_updated_at: "2000-01-01", p_reward: null,
}});
assert.equal(stale.retry, true);

let viewer = null;
const route = loadTs("app/api/posts/[id]/truth-vote/route.ts", {
  "next/cache": { revalidatePath() {} },
  "../../../../../lib/bay-space-db": storage,
  "../../../../../lib/bay-space-session": { getCurrentMember: async () => viewer },
});
const context = { params: Promise.resolve({ id: postId }) };
const vote = body => route.POST(new Request("http://localhost/truth-vote", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), context);
assert.equal((await vote({ score: 8 })).status, 401);
viewer = { member: "91002" };
for (const score of [null, "", "8", 0, 12, 2.5]) assert.equal((await vote({ score })).status, 400);
assert.equal((await vote({ score: 8, dimension: "unknown" })).status, 400);
assert.equal((await vote({ score: 8, dimension: "relevance" })).status, 200);
assert.equal((await vote({ score: 8, dimension: "relevance" })).status, 200);
assert.equal((await vote({ score: 9, dimension: "relevance" })).status, 409);
assert.equal((await storage.getPostTruthVoteSummary(postId, "91002")).relevance.userScore, 8);
assert.equal((await vote({ dimension: "relevance", remove: true })).status, 200);
assert.equal((await storage.getPostTruthVoteSummary(postId, "91002")).relevance.userScore, null);

const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const RatingScale = loadTs("app/components/current-event-rating-scale.tsx", {
  "./current-event-rating-scale.module.css": { default: {} },
}).default;
for (const labels of [
  ["Fallacious", "Biased", "Factual"],
  ["Unnecessary", "Good to know", "Crucial knowledge"],
]) {
  for (let score = 0; score <= 11; score += 1) {
    const html = renderToStaticMarkup(createElement(RatingScale, {
      title: "rating", labels, value: score, savedValue: null, voteCount: 0,
      disabled: false, saving: false, onChange() {}, onVote() {},
    }));
    const label = score === 0 ? "Unrated" : labels[score <= 3 ? 0 : score <= 7 ? 1 : 2];
    assert.ok(html.includes('aria-valuetext="' + label + '"'));
    assert.ok(html.includes('min="1" max="11" step="1"'));
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ""), /\b(?:[1-9]|10|11)\b/);
    if (score === 0) assert.match(html, /<button[^>]*disabled/);
  }
}

await db.exec("set role anon");
await assert.rejects(db.query("select set_current_event_rating(null,91002,'truth',5,now(),null)"), /permission denied/);
await db.exec("reset role");
await db.close();
console.log("PASS: archived rating reset, category isolation, migration rerun, all 11 scores, independent scales, totals, rewards, undo, concurrent retries, API validation, label boundaries, hidden numbers and permissions.");
