# UI spec document — Integrations

| | |
| --- | --- |
| **Prefix** | `UI-INT` |
| **Status** | Active |
| **Routes** | `/integrations` |
| **Roles** | A caller who may manage the active community (`canManage`) |
| **Domain rules** | `lucoenergia/conluz`: DCF-001, DCF-002, DCF-003 |
| **Design reference** | n/a |
| **Last reviewed against code** | #245 |

## Purpose

Let a community's administrator connect the community to external services. This document covers
only the Datadis configuration form, and only the rules #245 introduced. The Huawei and Shelly cards
on the same page are not covered: Huawei moves to plant detail in #192.

## Rules

### UI-INT-001 — An empty Datadis password keeps the stored one, and is required when none is stored

- **Status:** Active
- **Rule:**
  - When the password field is empty, the request MUST omit the `password` key and MUST NOT send `""`
    or `null`. When the field has a value, the request MUST send it as typed.
  - When a password is stored (`passwordSet` is `true`), the field MUST be optional. It MUST show
    visible helper text, not a tooltip, saying that leaving it empty keeps the current password.
  - When no password is stored (`passwordSet` is `false`, or the read of the configuration answers
    `404`), an empty field MUST block the save with a visible message on the field.
  - When the read of the configuration fails with anything other than `404`, the form MUST NOT require
    the password and MUST NOT show the helper text.
  - A `400` whose first error code is `DATADIS_CONFIG_PASSWORD_REQUIRED` MUST be shown on the password
    field, without the generic error. Every other refusal MUST keep the generic error.
  - After a successful save, the password field MUST be empty.
- **Rationale:** The password is write-only: the backend never returns it, so the field always starts
  empty, and an empty field can only mean "keep". Sending it empty wiped a working password before
  lucoenergia/conluz#404, and is a `400` since. A `404` means the community has no configuration yet,
  so there is no password to keep. Any other failed read says nothing about the password, so
  requiring one would block saves the backend accepts; the backend decides instead, and its refusal
  lands on the field. The field is emptied after a save so the next save keeps what was stored
  instead of sending it again.
- **Implements:** DCF-001, DCF-002, DCF-003
- **Source:** #245, lucoenergia/conluz#404

### UI-INT-002 — The Datadis form blocks a save it knows the backend will refuse

- **Status:** Active
- **Rule:**
  - The form MUST block saving while `username` is empty or blank, with a visible message on that
    field.
  - The form MUST block saving while `baseUrl` is empty or blank, or is not an absolute `http` or
    `https` URL, with a visible message on that field.
  - A message of this rule or of UI-INT-001 MUST appear once its field has been left or a save has
    been attempted. It MUST NOT appear on first render.
  - A blocked save MUST NOT open the save confirmation and MUST NOT send a request.
  - When the integration switch is off, a blocked save MUST open the credential fields, so that its
    messages are visible.
- **Rationale:** The backend refuses these values with a `400` that carries no error code, so the
  client is the only place that can say which field is wrong. An empty form is the normal state of a
  first setup, not a mistake, so it starts without messages. The backend checks the fields whether
  the integration is on or off, so a blocked save with the fields collapsed would say nothing.
- **Implements:** n/a
- **Source:** #245, lucoenergia/conluz#404

## States

The Datadis card only.

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | A spinner in place of the switch | None |
| Configured (`passwordSet: true`) | The stored username and base URL, an empty password field with the "keep" helper text | Edit, Guardar |
| Not configured (`404`, or `passwordSet: false`) | The form, with no messages until a field is left or a save is attempted | Edit, Guardar |
| Read failed (not `404`) | The form, empty, with no helper text and no password rule | Edit, Guardar |
| Blocked save | A message on each field that breaks a rule, and the fields open | Edit |
| Refused save (`DATADIS_CONFIG_PASSWORD_REQUIRED`) | A message on the password field, and no generic error | Edit, Guardar |

## Accepted exceptions

None.
