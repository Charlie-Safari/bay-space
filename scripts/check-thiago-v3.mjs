import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  vm.runInNewContext(output, { exports, require: name => mocks[name] ?? require(name), Date, Intl, URL });
  return exports;
}
const theory = load('../lib/theory-categories.ts');
const daily = load('../lib/daily-food-categories.ts');
const format = load('../lib/bay-space-quiz-format.ts');
const { parseThiagoV3: parse } = load('../lib/thiago-v3-intake.ts', {
  './theory-categories': theory, './daily-food-categories': daily, './bay-space-quiz-format': format,
});
const sameUrl = 'https://example.org/report';
const events = `Route: Current Events\nCategory: AI Emergence\nHeadline: A theory about facts moves forward\nTag 1: First fact\nSource link: ${sameUrl}\nTag 2: Second fact\nSource link: ${sameUrl}\nTag 3: Third fact\nSource link: ${sameUrl}`;
const event = parse(events);
assert.equal(event.category,'daily-food');
assert.equal(event.section,'AI Emergence');
assert.equal(event.tagSources.length,3);
assert.deepEqual([...event.tagSources],[sameUrl,sameUrl,sameUrl]);
assert.equal(event.sources.length,1);
const longBody = `A dream about facts and current events.\n\n${'Original detail. '.repeat(900)}`;
const conspiracy = parse(`Route: Conspiracy\nCategory: Rare Signals\nHeadline: Original account\nBody:\n${longBody}\nTopic Tags: dreams\nSources:\n${sameUrl}`);
assert.equal(conspiracy.category,'theory');
assert.equal(conspiracy.body,longBody.trim());
assert.equal(conspiracy.sources[0],sameUrl);
assert.throws(() => parse(`Route: Conspiracy\nCategory: Fake\nHeadline: No\nBody:\nOriginal`),/Unknown/);
assert.throws(() => parse(`Route: Conspiracy\nCategory: Rare Signals\nHeadline: No\nBody:\n${'x'.repeat(50001)}`),/50,000/);
assert.throws(() => parse(events.replace('Source link: https://example.org/report','Source link: invented')),/Tag 1/);
assert.equal(parse('Headline: Existing legacy article'),null);
assert.equal(parse(JSON.stringify({type:'poll',version:3,question:'Is this possible?',options:['Yes','No']})).kind,'poll');
assert.throws(() => parse(JSON.stringify({type:'poll',version:3,question:'Is this possible?',options:['Yes','yes']})),/differ/);
const question = {question:'What happened?',options:['A','B'],correctIndex:1,explanation:'B was reported.',postId:'00000000-0000-0000-0000-000000000001'};
const quiz = {title:'Weekly current events',weekStart:'2026-11-02',questions:Array.from({length:36},(_,i)=>({...question,question:`What happened ${i}?`}))};
assert.equal(parse(JSON.stringify(quiz)).draft.questions.length,36);
assert.throws(() => parse(JSON.stringify({...quiz,questions:quiz.questions.slice(1)})),/36/);
console.log('PASS: explicit article routes, source pairing, long body preservation, legacy fallback, Poll and Quiz validation.');
