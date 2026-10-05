# CLAUDE.md

The rules for working in this repository live in [`AGENTS.md`](AGENTS.md), shared by every AI coding
agent. Do not add rules here: edit `AGENTS.md`, so that all agents keep reading the same ones.

The line below makes Claude Code load `AGENTS.md` in full:

@AGENTS.md

## Claude Code specifics

- Skills under `.claude/skills/` are invoked through the Skill tool. Invoke
  `conluz-web-community-scope` before any data-fetching or role-gating work.
