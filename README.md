# agent-review-loop

A skill for Claude Code that stops the agent from marking its own homework.

The agent writes the deliverable. Independent reviewer agents, each starting with a fresh context, check it from one angle each, such as facts or a first-time reader. A single editor agent fixes what they find, and the reviewers look again. The loop ends when every reviewer passes the version that will actually ship, or after 3 rounds by default (plus a final review-only round), in which case the open issues are reported.

It works for any output, not just code: tickets, docs, reports, emails, SQL, data summaries, charts, plans and code changes.

## Install

```bash
npx skills add vdor/agent-review-loop -g -a claude-code -y
```

This copies the skill to `~/.claude/skills/agent-review-loop`. Restart Claude Code (or start a new session) to pick it up. It uses the [`skills`](https://www.npmjs.com/package/skills) CLI, so you need Node.js. Drop `-a claude-code -y` to pick other agents interactively.

No Node? Clone it instead:

```bash
git clone https://github.com/vdor/agent-review-loop ~/.claude/skills/agent-review-loop
```

## Use

Ask for it by name (`/agent-review-loop`), or just ask for checked work:

> Draft the release notes and have agents check them against the changelog.

> Write this SQL, then loop with reviewers until the numbers are right.

Claude also picks the skill up when you say things like "verify with agents" or "review it with agents".

## How it works

1. **Brief.** States what "good" means: audience, sources of truth, what must and must not be included, a length budget.
2. **Draft.** The agent writes the first version and runs the obvious self-checks.
3. **Review.** 1–3 reviewer agents ("lenses", one angle each, such as facts or reader) run in parallel. They read the sources, never edit, and grade each issue `must` or `should`. A lens passes when it has no `must`.
4. **Edit.** One editor fixes every `must` and only the `should`s that serve the brief.
5. **Repeat** until all lenses pass. Anything changed after the last pass is reviewed again.

The loop is sized to the job: a short message gets one or two lenses and a round or two, a multi-file change gets the full loop. When Claude Code's Workflow tool is available, `scripts/review-loop.js` runs the rounds; otherwise the skill drives them with plain subagents.

See [SKILL.md](SKILL.md) for the full rules.

## Update or remove

```bash
npx skills update agent-review-loop -g -y
npx skills remove agent-review-loop -g -y
```

If you installed with `git clone`, update with `git -C ~/.claude/skills/agent-review-loop pull` and remove by deleting that folder.

## License

[MIT](LICENSE)
