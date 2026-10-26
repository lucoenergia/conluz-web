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
| `UI-INT` | Integrations: the community integrations page and the plant's Huawei integration | [`integrations.md`](integrations.md) |
| `UI-PLT` | Plant detail: the plant's production, and the status of its agreements and integration; a plant deletion's refusal and its confirmation | [`plant-detail.md`](plant-detail.md) |
| `UI-SUP` | Supplies: deleting a supply from its card menu or its detail page | [`supplies.md`](supplies.md) |
| `UI-USR` | Users: the edit screen (removed in #285; tombstones only) | [`users.md`](users.md) |
| `UI-MBR` | Members: registration, the CSV import, invitations, member status, the member record edit and suspension, and the last active admin's role change and removal on the members page | [`members.md`](members.md) |
| `UI-PRF` | Profile: the email field | [`profile.md`](profile.md) |
| `UI-ROUTE` | Routing: what an unknown path renders | [`routing.md`](routing.md) |
| `UI-FMT` | Formatting of figures with units, dates and chart time labels | [`formatting.md`](formatting.md) |
| `UI-AGR` | Sharing agreements: the list, the detail page, the coefficient editor and their dialogs | [`sharing-agreements.md`](sharing-agreements.md) |
| `UI-INV` | Invitation acceptance: joining a community, or the platform admins, from the emailed link | [`invitation-acceptance.md`](invitation-acceptance.md) |
| `UI-HOM` | Home: the member and management home views | [`home.md`](home.md) |
| `UI-ADM` | Community admins: the platform admin's list, invitation and management of a community's admins | [`community-admins.md`](community-admins.md) |
| `UI-PAD` | Platform admins: the list, inviting to the role and the pending invitations, revoking the role, and what a platform admin with no membership can reach | [`platform-admins.md`](platform-admins.md) |
| `UI-ERR` | API errors: where and in whose words a refused request's message is shown, across screens | [`api-errors.md`](api-errors.md) |
| `UI-CTU` | Contact: the in-app contact page, its fallback, the platform admin's read-only view of a community's channels, and the public sign-in help page | [`contact.md`](contact.md) |
