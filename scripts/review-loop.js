export const meta = {
  name: 'agent-review-loop',
  description: 'Independent reviewers check each deliverable, an editor fixes it, repeat until every reviewer passes',
  whenToUse: 'Verify and improve drafted deliverables (text, docs, tickets, code, SQL, data) with independent reviewer agents in a loop',
  phases: [
    { title: 'Review', detail: 'each lens reviews each deliverable independently, read-only' },
    { title: 'Revise', detail: 'one editor per deliverable applies the reviewers\' fixes in place' },
  ],
}

// args = {
//   items: [{ key, target, purpose }]   // target: file path(s)/dir the reviewers read and the editor edits
//   sources: string                      // where the truth lives (files, commands, docs) - shared by all items
//   lenses: [{ key, prompt }]            // optional; defaults to facts + cold reader
//   editorRules: string                  // optional extra rules for the editor (length, format, do-not-touch)
//   maxRounds: number                    // optional, default 3
// }
const A = args ?? {}
if (!Array.isArray(A.items) || A.items.length === 0) throw new Error('args.items is required: [{key, target, purpose}]')
const MAX_ROUNDS = A.maxRounds ?? 3
const SOURCES = A.sources ?? 'No separate sources given: judge against the task brief in each item\'s purpose.'

const DEFAULT_LENSES = [
  {
    key: 'facts',
    prompt: `You are a skeptical correctness checker. Check every claim, number, behaviour and instruction in the deliverable against the sources of truth, opening and running what you need (read files, run read-only commands or tests). Flag anything wrong, overstated, unsupported, contradicting the sources, or missing a caveat the sources require. Flag a decision-relevant fact the sources contain that a reader would be misled without. Flag anything the brief says must NOT be included. Do not flag style.`,
  },
  {
    key: 'reader',
    prompt: `You are the intended audience seeing this for the first time, with none of the author's context. Judge whether you can understand and act on it in one pass: unexplained jargon, long or nested sentences, points that carry more than one idea, unclear actions, criteria that cannot be checked, redundancy, missing context, anything you would have to re-read, and deviations from the required format or length. Give concrete rewritten text as the fix. Do not fact-check.`,
  },
]
const LENSES = A.lenses?.length ? A.lenses : DEFAULT_LENSES

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'true only if there is no "must" issue left' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string', description: 'exact text, file:line or artefact the issue is about' },
          problem: { type: 'string' },
          evidence: { type: 'string', description: 'what in the sources or which command output shows it' },
          fix: { type: 'string', description: 'concrete replacement text or action' },
          severity: { type: 'string', enum: ['must', 'should'] },
        },
        required: ['quote', 'problem', 'fix', 'severity'],
      },
    },
  },
  required: ['pass', 'issues'],
}

const reviewPrompt = (item, lens, round) => `${lens.prompt}

Round ${round}. Deliverable: ${item.target}
What it is and what it must achieve: ${item.purpose}

Sources of truth:
${SOURCES}

Rules:
- Read-only: do not edit any file.
- "must" = wrong, misleading, breaks the brief, blocks the reader, or leaves out information the reader needs so as not to decide wrongly. "should" = a real improvement that does not change what the reader will conclude. Wording preferences are not issues. "should"s are not applied after a passing round, so grade carefully.
- Do not invent issues to seem thorough; an empty list with pass=true is a valid answer.
- Set pass=true only if you found no "must" issue.`

const editorPrompt = (item, round, issues) => `You are the editor. Round ${round}. Edit ${item.target} in place to resolve these reviewer issues.
What it is and what it must achieve: ${item.purpose}

Sources of truth:
${SOURCES}

Issues (JSON):
${JSON.stringify(issues, null, 2)}

Rules:
- Resolve every "must". Apply a "should" only when it serves the brief (correctness, the audience's understanding); skip polish. Every extra change is a new chance of error and usually costs another round.
- Check each issue against the sources before acting; skip any that is wrong, and say why.
- Where two issues conflict, pick the one the sources support.
- Keep the deliverable as short as it can be while fixing the issues; do not add sections or scope unless an issue requires it.
- Only edit ${item.target}. If a fix needs a change elsewhere (a generator script, another file), do not make it; list it under "Needs the orchestrator".
${A.editorRules ?? ''}
Return a short plain-text list: what you changed, what you skipped (with reason), and "Needs the orchestrator" items if any.`

async function reviewRound(item, round) {
  const verdicts = await parallel(LENSES.map((lens) => () =>
    agent(reviewPrompt(item, lens, round), { label: `${item.key}:${lens.key} r${round}`, phase: 'Review', schema: VERDICT })
      .then((v) => ({ lens: lens.key, ...(v ?? { pass: false, issues: [], failed: true }) }))))
  const issues = verdicts.flatMap((v) => v.issues.map((i) => ({ lens: v.lens, ...i })))
  return {
    round,
    verdicts: Object.fromEntries(verdicts.map((v) => [v.lens, v.failed ? 'agent-failed' : v.pass ? 'pass' : 'fail'])),
    issues,
    passed: verdicts.every((v) => v.pass && !v.failed),
  }
}

return await pipeline(A.items, async (item) => {
  const history = []
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const r = await reviewRound(item, round)
    history.push({ round, verdicts: r.verdicts, issues: r.issues.length, must: r.issues.filter((i) => i.severity === 'must').length, issueList: r.issues })
    log(`${item.key} round ${round}: ${Object.entries(r.verdicts).map(([k, v]) => `${k} ${v}`).join(', ')}; ${r.issues.length} issues`)
    if (r.passed) return { item: item.key, converged: true, rounds: round, history }
    const changes = await agent(editorPrompt(item, round, r.issues), { label: `${item.key}:edit r${round}`, phase: 'Revise' })
    history[history.length - 1].changes = changes
  }
  // The last edit has not been reviewed yet: one review-only round decides the final state.
  const final = await reviewRound(item, MAX_ROUNDS + 1)
  history.push({ round: MAX_ROUNDS + 1, reviewOnly: true, verdicts: final.verdicts, issues: final.issues.length, must: final.issues.filter((i) => i.severity === 'must').length, issueList: final.issues })
  log(`${item.key}: final review-only round ${final.passed ? 'passed' : 'still has issues'}`)
  return { item: item.key, converged: final.passed, rounds: MAX_ROUNDS, history, openIssues: final.passed ? [] : final.issues.filter((i) => i.severity === 'must') }
})
