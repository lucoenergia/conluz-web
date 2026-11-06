# UI spec document — API errors

| | |
| --- | --- |
| **Prefix** | `UI-ERR` |
| **Status** | Active |
| **Routes** | Every screen that shows the message of an API error detail |
| **Roles** | Any caller |
| **Domain rules** | `lucoenergia/conluz`: PLT-002 |
| **Design reference** | n/a |
| **Last reviewed against code** | #358 |

## Purpose

Tell the user why a request was refused in the app's own words and register, and where they can fix
it. The catalogue in `src/errors/apiErrorCatalogue.ts` holds the app's text for each error code it
maps; the server's message is only the fallback for the codes it does not.

Screens that word a code their own way, such as the member invitation actions or the import rows
of UI-MBR-023 and UI-SUP-008, are covered by the exception in UI-ERR-001. UI-SUP-009 applies
UI-ERR-001 and UI-ERR-002 to the supply forms.

This document covers only the rules #232, #324, #253 and #378 introduced, and #358's exception to
UI-ERR-003.

## Rules

### UI-ERR-001 — A code in the catalogue is shown with the catalogue's text

- **Status:** Active
- **Rule:** When the UI shows the message of an API error detail whose code has a catalogue entry, it
  MUST NOT show the server's message. It MUST show the catalogue's text, unless the screen words that
  code with its own text.
- **Rationale:** The app owns its wording and register; the server's text is a fallback, not copy.
- **Implements:** n/a
- **Source:** #232

### UI-ERR-002 — A code about one input is shown on that input

- **Status:** Active
- **Rule:** When an API error detail whose code has a catalogue entry refers to exactly one input of
  the form that sent the request — the input the code names, or the one named by its `field` param —
  the UI MUST show the message as an error on that input and MUST keep every value the user typed.
- **Rationale:** The user must see what to fix where they fix it, without retyping.
- **Implements:** n/a
- **Source:** #232

### UI-ERR-003 — A code outside the catalogue is shown with the server's message

- **Status:** Active
- **Rule:** When the UI shows the message of an API error detail whose code has no catalogue entry,
  it MUST show the server's message, unless the screen's own rule words such a refusal with a
  message of its own (UI-MBR-044).
- **Rationale:** An unmapped code still carries the reason the request was refused, and the server's
  message is the only text that states it. A screen that checks every input before sending can
  word what is left itself.
- **Implements:** n/a
- **Source:** #232; changed in #358 (the investment editor's exception)

### UI-ERR-004 — Every energy metrics period code has a catalogue entry

- **Status:** Active
- **Rule:** Every `ENERGY_METRICS_PERIOD_*` code MUST have a catalogue entry.
- **Rationale:** The client translates by code; without an entry, UI-ERR-003 would show the
  server's English message.
- **Implements:** n/a
- **Source:** #324, lucoenergia/conluz#409

### UI-ERR-005 — `SUPPLY_ALREADY_HAS_PLANT` has a catalogue entry

- **Status:** Active
- **Rule:**
  - `SUPPLY_ALREADY_HAS_PLANT` MUST have a catalogue entry, which takes no params: "Este punto de
    suministro ya pertenece a otra planta."
  - The plant create and edit forms MUST show a refusal's error detail by UI-ERR-001 and UI-ERR-003,
    and their own generic text when the refusal carries none.
- **Rationale:** The client translates by code; without an entry, a community admin who picks a
  supply that already belongs to another plant would read the server's English message (UI-ERR-003).
  The forms showed one generic text for every refusal, which never says that this one cannot be
  retried.
- **Implements:** PLT-002
- **Source:** #253, lucoenergia/conluz#411

### UI-ERR-006 — The too-long period refusal states the limit it carries

- **Status:** Active
- **Rule:**
  - When `params.amount` is a whole number from 1 up (the contract's string, or a number) and
    `params.unit` is `MONTHS` or `DAYS`, the `ENERGY_METRICS_PERIOD_TOO_LONG` entry MUST read "El
    periodo puede abarcar como máximo {amount} {meses|días}.", with "1 mes" and "1 día" singular.
  - Without params, or with an amount or unit it cannot read, the entry MUST read "El periodo es
    demasiado largo.".
  - The server's message MUST never be shown for this code.
- **Rationale:** One code carries two limits: 24 months on most operations, and 31 days on the
  hourly series. A fixed limit in the text would be wrong for one of them. A sentence without a
  limit is less useful than one with the right limit, but never misleading.
- **Implements:** EPR-005 (lucoenergia/conluz#545, #546), under which the refusal carries the limit
  it enforces.
- **Source:** #378, lucoenergia/conluz#546

## States

| State | Rendered |
| --- | --- |
| Error, code in the catalogue | The catalogue's text, or the screen's own text for that code, where the screen shows errors or on the input the code refers to |
| Error, code not in the catalogue | The server's message, where the screen shows errors |
