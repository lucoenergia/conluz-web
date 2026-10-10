# UI spec documents

Living specifications of the **UI rules** of `conluz-web`: what is rendered, when, and how it
behaves. Domain rules are not here; they live in `lucoenergia/conluz` → `docs/specs/`.

The conventions (rule format, IDs, statuses, maintenance and workflow) are defined once, in
[`lucoenergia/conluz` → `docs/specs/README.md`](https://github.com/lucoenergia/conluz/blob/main/docs/specs/README.md).
This file only records what differs here.

## Terminology

In this repository **spec** has two meanings, so always qualify it:

- **spec document**: a file under `docs/specs/`.
- **test spec** or **test**: a Vitest or Playwright file under `src/` or `tests/`.

An unqualified "update the spec" is ambiguous. Ask which one is meant.

## Differences from the domain specs

- Rule IDs use the `UI-<PREFIX>-<NNN>` format, e.g. `UI-SUP-001`.
- A UI rule that enforces a domain rule references it by ID in **Implements** and never restates it.
- Styling values come from the theme tokens (`references/theme-tokens.md`); a spec document never
  contains colour codes or pixel values.
- Tests start their title with the rule ID: `test('UI-SUP-001 …', …)`.
- Spec document updates follow this repository's commit format (`[conluzweb-XXX] …`), not
  `[conluz-XXX] …`.

## Prefix registry

| Prefix | Screen or flow | File |
| --- | --- | --- |
| `UI-ENT` | Community entry: which community is active and where a caller lands | [`community-entry.md`](community-entry.md) |
