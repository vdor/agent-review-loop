---
name: agent-review-loop
description: Produce a deliverable, then have independent reviewer agents check it and an editor fix it, looping until every reviewer passes. Works for any output, not just code - Jira tickets and comments, docs, reports, emails and messages, SQL, data summaries, charts, plans, code changes. Use this whenever the user asks to "verify with agents", "have agents check it", "loop until it's good", "review it with agents", "iterate until the numbers are right", or wants work checked by fresh eyes rather than self-reviewed, even if they don't name the skill. Also use it when the user has asked for this way of working earlier in the conversation and now asks for another deliverable.
---

# Agent review loop

The author of a piece of work is the worst person to check it: they read what they meant, not what they wrote. This skill separates the roles. You produce the work, independent reviewer agents with fresh context check it from specific angles, an editor fixes what they find, and reviewers look again. The loop ends when every reviewer passes the version that will actually be delivered.

The loop is only worth something if two things hold: what ships is exactly what was reviewed, and what you tell the user about the review is true. Most of this skill protects those two things.

## 1. Size the loop to the deliverable

Match the effort to what is at stake. A heavy loop on a two-line message wastes the user's time and buries the answer.

| Deliverable | Where it lives | Lenses | Rounds |
| --- | --- | --- | --- |
| **Small, conversational**: a message, email, short answer, a paragraph | In your reply. Reviewers get the text inline. | 1–2 | 1–2 |
| **Medium**: ticket, doc, report, SQL, a focused code change | Files, one per deliverable | 2 | up to 3 |
| **Large**: several deliverables, multi-file code | Files; use the workflow script | 2–3 | up to 3 |

For a small deliverable, the user should see the result itself in your reply, not a pointer to a file and not a story of the process. At most one line mentions the review.

- **One round is usually enough.** If both lenses pass, you are done.
- **Don't chase optional suggestions** into further rounds.
- **Judgement calls go to the user.** Where the answer mostly depends on the user's own judgement (how a message will land, what tone they want), give them your view and the reviewed text, and let them decide.

## 2. Write the brief

Pin down what "good" means before drafting. Keep it short; reviewers receive it verbatim.

- **Deliverable and audience:** what is made, for whom, in which language and format.
- **Sources of truth:** the files, data, commands or documents the content must agree with. Reviewers check against these, not against your memory. When there are none, the user's request and their stated facts are the source.
- **Must include / must not include:** scope limits matter as much as content. For example, a ticket that must only pose a problem must not leak the answer.
  - State the limit as a rule about meaning, not as a list of banned words. Say "nothing that describes how it will be solved, including acceptance criteria that restate the solution's features or its go-live risks", not "don't mention Kafka or caching".
  - With a word list, reviewers check for words and miss indirect leaks.
- **Fidelity:** when you rewrite the user's own text, such as their message or reasons, keeping their meaning is part of correctness.
  - Replacing their stated reason with a different one is a `must` unless you flag it.
  - Quote the user's stated facts word for word in the brief. A paraphrase that already matches your draft ("little or no contact" for "no contact") quietly approves your own change before any reviewer looks.
- **Constraints:** length, house style, conventions the user stated or the repo shows.
- **Conflicts:** when the user's input contradicts the sources (a figure that does not match the data, for example), the deliverable uses what the sources support.
  - The user's claim may appear only as unverified, and only if they asked for it.
  - Always raise the conflict with the user in your report.
  - Record the conflict in the brief neutrally ("user says the migration takes 2 weeks; plan.md says 5"), not your own ruling on it. A brief that settles the dispute ("present both as open") makes reviewers check against your ruling instead of the sources.
  - In general, the brief states requirements and where the truth is. Reviewers check against the truth, not against your conclusions.
- **Language:** reply in the language the user wrote to you in, even if the deliverable itself is in another language.

When something that changes the outcome is truly ambiguous, ask once. Otherwise pick a sensible default and state it.

## 3. Produce the first draft

Draft it yourself when you hold the context. Do the obvious self-checks first (numbers add up, code runs, tests pass), because reviewers are for what you cannot see.

- **Supporting artefacts** (charts, CSVs, sample outputs): generate them from a script so any fix can be regenerated consistently. Deliver the script with them, because the user needs it to regenerate the artefact later.
- **Length budget:** put one in the brief, for example "comment ≤ 300 words" or "report readable in 2 minutes". Reviewers flag an overrun as `must`. Without a budget, every round adds a caveat, and the deliverable grows.
- **Scratch files** (drafts of reviewer prompts, round logs, notes): keep them in a temporary or scratch directory, not in the user's project or deliverable folder.
- **If a tool or hook refuses to write a file** (some setups block new `.md` files): use another permitted way, such as the shell, and say so.

## 4. Pick the reviewer lenses

Each lens is one independent agent with one job. Always include a correctness lens; add others only where they catch something different.

| Deliverable | Lenses |
| --- | --- |
| Text for people (ticket, comment, doc, report, message) | **facts**: every claim against the sources. **reader**: the actual audience, first time, one pass. |
| Code change | **behaviour**: run tests and build, try edge cases, compare with the requirement. **reader**: maintainability, fits the surrounding code. Optionally **security**. |
| SQL / queries | **facts**: run read-only on a safe database, check results. **safety**: read-only, no heavy production scans. |
| Data, charts, CSVs | **facts**: recompute from the raw data, open the images. **reader**. |

Rules for every lens:
- **Use the sources:** reviewers open files, run commands, look at images. A reviewer that only reads the deliverable paraphrases it back.
- **Never edit:** one editor per deliverable, so agents do not overwrite each other.
- **Concrete issues:** each quotes the text or location, the problem, the evidence and a fix. It is graded `must` or `should`, and an empty list is a valid answer. Pass means no `must`.
  - **`must`:** wrong, misleading, or breaks the brief. It also covers information the reader needs in order not to decide wrongly. For example, "the ranking flips if one disputed record is wrong" is a `must`, not polish.
  - **`should`:** a real improvement that does not change what the reader will conclude.

  Since `should`s are not applied after a passing round, the grading decides what gets fixed.
- **Do not steer reviewers:** give them the brief and the sources, never your defence of the draft ("the criteria are fine, accept them"). A reviewer told what to conclude is not a review. If you disagree with a finding, let the next round judge it, or report the disagreement to the user.

## 5. Run the loop

Each round:
1. Spawn all lens reviewers for the deliverable **in one message** so they run in parallel. Each one gets:
   - its lens prompt;
   - the brief, inline, not as a path to a shared file;
   - the sources;
   - the deliverable: a file path, or the text inline for small ones.
2. **Wait for every reviewer's actual result before writing anything about it.**
   - If the agent tool runs reviewers in the background and returns at once, end your turn right there and wait for the completion notifications. Do not start drafting the summary or the next round. Quote only results that have actually arrived.
   - In testing, authors who kept writing while reviewers ran twice ended up inventing verdicts ("both reviewers passed…") that the reviewers never gave. Then they had to retract them.
   - If you can run reviewers in the foreground (blocking), do that instead.
3. **If all pass, triage the remaining `should`s before you stop.** Reviewers sometimes grade a real defect as `should`. Read each one and ask: would it change what the reader concludes, or does it change the user's stated facts or meaning?
   - These are defects, whatever grade they were given:
     - overclaims ("backups are instant" when the source says hourly);
     - misleading wording;
     - a missing decision-relevant fact;
     - altered user facts ("my manager approved it" becoming "the team approved it").

     Fix them by scoping or removing the wording, not by leaving it as "your call". That includes wording that already implies something the source does not support, such as a promise or a requirement.

     Then have the lenses whose area the edit touches re-check it. If a lens did not see the final version, say so in your report.
   - Everything else goes into your report for the user to decide. Do not apply it: an edit after a passing round reopens the loop, and in testing that is how deliverables grew and loops ran past their limit.
   - Never tell the user that none of the suggestions changes the conclusion unless you have checked each one.

   If not all pass, spawn one editor with the combined issues:
   - It fixes every `must`.
   - It applies a `should` only when it serves the brief: correctness, or the audience's understanding. It skips polish.
   - It skips findings the sources contradict, and says why.

   Every extra change is a new chance for an error and usually costs another round. In testing, an optional error-message tweak introduced a bug, and it took a whole round to find it.
4. **Log the round:** verdict per lens, count of issues, what changed. Keep the log in a scratch directory unique to this run, for example one named after the deliverable plus a timestamp. Several loops may run at once, and a shared scratch path lets one run overwrite another run's files.

**The last-edit rule.** Whatever ships must have passed review after its final change. That includes a "tiny wording fix" a reviewer suggested, done by you or with `sed` after the last pass. In practice the pull to make one more small edit after the reviews is strong, and that edit is where regressions slip in. If you change anything after the last pass, run one more round: the affected lens is enough.

**The round limit is a hard stop:** 3 rounds by default, plus at most one review-only round. When it is reached with issues left, fix what you can, run the final review-only round, and report what is still open. Loops that keep going past the limit mostly trade small wording preferences back and forth, and the deliverable grows.

**One exception:** the final review-only round may still fail on a `must` that is small and clear, and that the reviewers agree on. Apply that fix and have one lens re-check it. That is better than shipping a known flaw only to save a round. This does not apply to `should`s after a passing round; those go to the user.

**How to orchestrate:**
- **Workflow tool available** (usually only in the main session): run `scripts/review-loop.js` via `scriptPath`, passing the brief as `args`. Invoking this skill counts as the user's opt-in to running it. It parallelises deliverables and always ends with a review-only round. The script header documents the args (`items`, `sources`, `lenses`, `editorRules`, `maxRounds`); the default lens prompts in it are a good starting point for your own.
- **Only the Agent tool** (typical inside subagents): run the rounds above by hand with `Agent` calls. The rules are the same.
- **No subagents at all:** do each review as a separate pass. Re-read the brief and sources, take one lens at a time, and write the verdict down before editing. Tell the user this is weaker than independent review.

Before a large loop, tell the user roughly how many agents it will use. For example: "2 lenses × 2 deliverables × up to 3 rounds, about 12–20 agents".

## 6. While the loop runs

- **Do not edit files the editor is working on.** One of you will overwrite the other.
- **If the user changes scope mid-run, stop and restart.** A loop working from an old brief keeps polishing the wrong thing. Update the brief, then relaunch. Deliverables that already passed and did not change can be left out.
- **Turn user corrections into brief rules** so later rounds enforce them.

## 7. Check the loop's work yourself

Agents report what they believe they did. Before reporting:
- **Read the final deliverables.** Did anything grow out of proportion? Editors add length each round. If it did, run a round in which the reader lens cuts whatever is not a decision, reason or requirement.
- **Look for changes outside the target** (`git status`, recently modified files). An editor may have hand-edited a generated artefact. That fix vanishes on the next regeneration, so fix the generator instead.
- **Spot-check two or three `must` fixes** against the sources.
- **Measure anything you will quote.** Word counts, test counts and totals should be measured now, not recalled.

## 8. Report to the user

Lead with what the user asked for. For a small deliverable, that is the answer and the finished text. For files, it is the result and where the files are.

Then add a short review summary, around 15 lines at most. It is a summary of the outcome, not a round-by-round story:

- **Status:** passed in round N, or what is still open.
- **What the review changed:** the few changes that matter, attributed correctly. Say what reviewers found and what you changed yourself; do not credit reviewers with your own edits.
- **Every finding is accounted for:** each reviewer finding was fixed, or is reported as open or declined with the reason.
- **Optional suggestions:** list at most the three that matter most, and say how many minor ones exist ("4 more small wording suggestions, available if you want them"). A long list of options buries the result.
- **What the user must decide or fill in:** placeholders, conflicts such as a figure that does not match the data, and assumptions.
- **Consistency:** the status line agrees with the open items. "Passed, nothing wrong" cannot sit above a list of open issues. If you also save the report to a file, it is the same text.

Do not describe an unreviewed or unconverged deliverable as done.
