# UI spec document — Integrations

| | |
| --- | --- |
| **Prefix** | `UI-INT` |
| **Status** | Active |
| **Routes** | `/integrations`, `/production/:plantId` |
| **Roles** | `/integrations`: a caller who may manage the active community (`canManage`). Plant detail's integrations section: a caller who may manage that plant (the plant's `canManage`) |
| **Domain rules** | `lucoenergia/conluz`: DCF-001, DCF-002, DCF-003 |
| **Design reference** | n/a |
| **Last reviewed against code** | #256 |

## Purpose

Let an administrator connect the community, and each of its plants, to external services. The
community integrations page holds the community-scoped integrations, Datadis and Shelly. The Huawei
integration belongs to a plant and is configured from that plant's detail screen.

This document covers the Datadis configuration form (the rules #245 introduced) and its switch
(#256), the plant's Huawei integration, and which integrations the community page lists (#192). The
Shelly card is not covered.

## Rules

### UI-INT-001 — An empty Datadis password keeps the stored one

- **Status:** Active
- **Rule:**
  - When the password field is empty, the request MUST omit the `password` key and MUST NOT send `""`
    or `null`. When the field has a value, the request MUST send it as typed.
  - When a password is stored (`passwordSet` is `true`), the field MUST show visible helper text, not
    a tooltip, saying that leaving it empty keeps the current password.
- **Rationale:** The password is write-only: the backend never returns it, so the field always starts
  empty, and an empty field can only mean "keep". Sending it empty wiped a working password before
  lucoenergia/conluz#404, and is a `400` since. Without the helper text, an admin cannot tell that an
  empty field keeps the stored password rather than clearing it.
- **Implements:** DCF-001, DCF-003
- **Source:** #245, lucoenergia/conluz#404

### UI-INT-002 — The Datadis form blocks a save it knows the backend will refuse

- **Status:** Active
- **Rule:**
  - The form MUST block saving while `username` is empty or blank, with a visible message on that
    field.
  - The form MUST block saving while `baseUrl` is empty or blank, or is not an absolute `http` or
    `https` URL, with a visible message on that field.
  - A message of this rule or of UI-INT-003 MUST appear once its field has been left or a save has
    been attempted. It MUST NOT appear on first render.
  - A blocked save MUST NOT open the save confirmation and MUST NOT send a request.
- **Rationale:** The backend refuses these values with a `400` that carries no error code, so the
  client is the only place that can say which field is wrong. An empty form is the normal state of a
  first setup, not a mistake, so it starts without messages. The fields are always shown
  (UI-INT-014), so a blocked save's messages are visible whether the integration is on or off.
- **Implements:** n/a
- **Source:** #245, #256, lucoenergia/conluz#404

### UI-INT-003 — A Datadis password is required when none is stored

- **Status:** Active
- **Rule:**
  - When no password is stored (`passwordSet` is `false`, or the read of the configuration answers
    `404`), an empty password field MUST block the save with a visible message on the field.
  - When the read of the configuration fails with anything other than `404`, the card MUST show an
    error with a retry instead of the form: no credential fields, no switch, no Guardar, and nothing
    said about whether a password is stored.
- **Rationale:** A `404` means the community has no configuration yet, so there is no password to
  keep, and a save without one can only be refused. Any other failed read says nothing about what is
  stored: not the password, and not `enabled`, which an edit must send unchanged (UI-INT-014). A
  save from that state would have to guess `enabled` and could turn off a working integration, so
  there is nothing to offer but the retry, as for Huawei (UI-INT-007).
- **Implements:** DCF-002
- **Source:** #245, #256, lucoenergia/conluz#404

### UI-INT-004 — The backend's password refusal lands on the password field

- **Status:** Active
- **Rule:**
  - A `400` whose first error code is `DATADIS_CONFIG_PASSWORD_REQUIRED` MUST be shown on the password
    field, without the generic error. Every other refusal MUST keep the generic error.
  - After a successful save, the password field MUST be empty.
- **Rationale:** The client cannot always know that no password is stored: a password wiped before
  lucoenergia/conluz#404 may still read as stored. The refusal names the
  field to fix, so it belongs on that field, not in a generic message. The field is emptied after a
  save so the next save keeps what was stored instead of sending it again.
- **Implements:** DCF-002
- **Source:** #245, lucoenergia/conluz#404

### UI-INT-005 — Huawei is configured only from the detail screen of its plant

- **Status:** Active
- **Rule:**
  - The Huawei configuration MUST be read and written only from the detail screen of the plant it
    belongs to, for the plant named by the route's `plantId`.
  - No screen may select a plant implicitly to read or write a Huawei configuration.
  - A write to one plant's configuration MUST refresh only that plant's configuration.
- **Rationale:** The configuration endpoints are plant-scoped, and a community can have several
  plants. The community page used to configure whichever plant the plant list returned first, so an
  admin could edit a plant they never chose without knowing which one it was.
- **Implements:** n/a
- **Source:** #192

### UI-INT-006 — The plant integrations section is only for a caller who may manage the plant

- **Status:** Active
- **Rule:** The plant integrations section MUST render only when the plant's `capabilities.canManage`
  is `true`; otherwise nothing renders, with no placeholder, no disabled control and no read of the
  configuration.
- **Rationale:** Reading the configuration needs exactly what writing it needs (the plant's
  `canManage`), so there is no read-only view to fall back to. A community capability does not
  answer for a plant.
- **Implements:** n/a
- **Source:** #192, lucoenergia/conluz#399

### UI-INT-007 — A plant with no Huawei configuration shows an empty state, not an error

- **Status:** Active
- **Rule:**
  - When the read answers `404`, the section MUST show visible text saying that the plant has no
    Huawei configuration yet and a "Configurar" action, with no error styling and no switch.
  - When the read fails with anything other than `404`, the section MUST show an error with a retry,
    and MUST NOT claim whether a password is stored.
  - A configured plant MUST show its username and base URL and whether a password is stored, and
    MUST NOT show the password.
- **Rationale:** A `404` is the normal state of a new plant, not a failure, so it must not look like
  one; there is nothing to turn on before a configuration exists. Any other failure says nothing
  about what is stored, so the screen claims nothing, as UI-INT-003 does for Datadis. The password is
  write-only: only `passwordSet` comes back.
- **Implements:** n/a
- **Source:** #192

### UI-INT-008 — The Huawei form follows the Datadis form's rules, and never sets `enabled`

- **Status:** Active
- **Rule:**
  - The Huawei form MUST follow UI-INT-001, UI-INT-002, UI-INT-003 and UI-INT-004, with
    `HUAWEI_CONFIG_PASSWORD_REQUIRED` in place of `DATADIS_CONFIG_PASSWORD_REQUIRED`.
  - Creating a configuration MUST require a password; editing one MUST NOT, when one is stored.
  - The form MUST NOT have an `enabled` control. A create MUST send `enabled: false`, and an edit
    MUST send the stored `enabled` unchanged.
  - After an enable or disable, an edit MUST send the `enabled` that write stored, even before the
    configuration has been read again.
- **Rationale:** Both providers share the same write-only password contract, so they share the
  rules and the code that applies them. Turning the integration on or off is a separate decision,
  taken on the switch (UI-INT-009): a new configuration starts disabled so that it syncs only once
  someone turns it on, and an edit of the credentials must not turn it on or off as a side effect.
  An edit made between a toggle and the read that follows would otherwise send the old `enabled`,
  undoing the toggle.
- **Implements:** n/a
- **Source:** #192, #256, lucoenergia/conluz#399

### UI-INT-009 — The Huawei switch goes through its own actions, and states when it is off

- **Status:** Active
- **Rule:**
  - Turning the integration on MUST call `enableHuaweiConfig`, and turning it off MUST call
    `disableHuaweiConfig`. The switch MUST NOT call the configuration write.
  - The switch MUST reflect the stored `enabled`, ask for confirmation, and MUST NOT be operable again
    while a write is in flight.
  - While the stored configuration is disabled, the section MUST show visible text saying so; while
    it is enabled, that text MUST NOT show.
  - A `404 HUAWEI_CONFIG_NOT_FOUND` MUST read the configuration again, which shows UI-INT-007's empty
    state. Any other refusal, apart from UI-INT-010's, MUST show the generic error feedback.
- **Rationale:** The enable and disable endpoints change only `enabled`. Toggling through the
  configuration write would also rewrite the username and base URL with whatever the screen last
  read, overwriting an edit made meanwhile. A configuration starts disabled (UI-INT-008), so the screen says why nothing syncs.
  A `404` here means the configuration was deleted meanwhile, and showing the stale one would offer
  actions that can only fail.
- **Implements:** n/a
- **Source:** #192, lucoenergia/conluz#414

### UI-INT-010 — An incomplete Huawei configuration names what is missing

- **Status:** Active
- **Rule:** A `409 HUAWEI_CONFIG_INCOMPLETE` on enable MUST leave the switch off and show the fields
  in `params.missingFields` in Spanish ("usuario", "URL del servicio", "contraseña"), with an action
  that opens the edit form.
- **Rationale:** The backend refuses to enable a configuration that cannot work and says which
  fields it lacks. Naming them, with the way to fix them one tap away, turns a dead end into the next
  step.
- **Implements:** n/a
- **Source:** #192, lucoenergia/conluz#414

### UI-INT-011 — The community integrations page lists only community-scoped integrations

- **Status:** Active
- **Rule:** The community integrations page MUST list only community-scoped integrations: Datadis
  and Shelly. It MUST NOT read a plant or a plant's configuration.
- **Rationale:** A plant-scoped integration on a community page can only be reached by picking a
  plant implicitly, which UI-INT-005 forbids.
- **Implements:** n/a
- **Source:** #192

### UI-INT-012 — The Datadis switch goes through its own actions, and states when it is off

- **Status:** Active
- **Rule:**
  - With a configuration stored, the switch MUST reflect the stored `enabled`. Turning it on MUST
    call `enableDatadisConfig`, and turning it off MUST call `disableDatadisConfig`. The switch MUST
    NOT call the configuration write.
  - The switch MUST ask for confirmation, and MUST NOT be operable again while a write is in flight.
  - While the stored configuration is disabled, the card MUST show visible text saying so and
    inviting the admin to enable it; while it is enabled, that text MUST NOT show.
  - A `404 DATADIS_CONFIG_NOT_FOUND` MUST discard the stored configuration on screen, which shows
    UI-INT-014's create form. Any other refusal, apart from UI-INT-013's, MUST show the generic error
    feedback.
- **Rationale:** The enable and disable endpoints change only `enabled`. Toggling through the
  configuration write would also rewrite the username and base URL with whatever the screen last
  read, overwriting an edit made meanwhile. A new configuration starts disabled (UI-INT-014), so
  the card says why nothing syncs. A `404` here means the configuration was deleted meanwhile, and
  showing the stale one would offer actions that can only fail. Same model as Huawei (UI-INT-009).
- **Implements:** n/a
- **Source:** #256, lucoenergia/conluz#414

### UI-INT-013 — An incomplete Datadis configuration names what is missing

- **Status:** Active
- **Rule:** A `409 DATADIS_CONFIG_INCOMPLETE` on enable MUST leave the switch off and show the fields
  in `params.missingFields` in Spanish ("usuario", "URL del servicio", "contraseña"), with an action
  that brings the admin to the first missing field and focuses it.
- **Rationale:** The backend refuses to enable a configuration that cannot work and says which
  fields it lacks. The fields are on the card already (UI-INT-014), so the next step is the first of
  them, not another screen.
- **Implements:** n/a
- **Source:** #256, lucoenergia/conluz#414

### UI-INT-014 — The Datadis form never sets `enabled`, and always shows its fields

- **Status:** Active
- **Rule:**
  - The form MUST NOT have an `enabled` control. A create (the read answered `404`) MUST send
    `enabled: false`, and an edit MUST send the stored `enabled` unchanged.
  - The credential fields MUST be shown whether the integration is enabled or disabled.
  - With no configuration stored, the card MUST show the form with no switch.
  - After an enable or disable, an edit MUST send the `enabled` that write stored, even before the
    configuration has been read again, and Guardar MUST wait while it is read again.
- **Rationale:** Turning the integration on or off is a separate decision, taken on the switch
  (UI-INT-012). A new configuration starts disabled so that it syncs only once someone turns it on,
  and an edit of the credentials must not turn it on or off as a side effect. The fields used to fold
  away with the switch off, which only made sense while the switch was part of the form. An edit made
  between a toggle and the read that follows would otherwise send the old `enabled`, undoing the
  toggle, and an undone disable would bypass the completeness check of the enable.
- **Implements:** n/a
- **Source:** #256, lucoenergia/conluz#414

## States

The Datadis card only.

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | A spinner in place of the switch | None |
| Not configured (`404`) | The form, with no switch and no messages until a field is left or a save is attempted | Edit, Guardar |
| Configured, enabled | The switch on; the stored username and base URL; an empty password field, with the "keep" helper text when `passwordSet` is `true` | Switch, Edit, Guardar |
| Configured, disabled | As above, the switch off, and text saying the integration is disabled | Switch, Edit, Guardar |
| Enable refused (`DATADIS_CONFIG_INCOMPLETE`) | The switch off and a message naming the missing fields | Completar configuración, Switch, Edit, Guardar |
| Read failed (not `404`) | An error with a retry; no fields, no switch, nothing said about the password | Reintentar |
| Read again after a toggle | As configured, with Guardar disabled until the read lands | Switch (disabled while its write runs), Edit |
| Blocked save | A message on each field that breaks a rule | Edit |
| Refused save (`DATADIS_CONFIG_PASSWORD_REQUIRED`) | A message on the password field, and no generic error | Edit, Guardar |

The plant's Huawei integration, on plant detail.

| State | Rendered | Actions available |
| --- | --- | --- |
| Not offered (plant `canManage` false) | Nothing | None |
| Loading | A spinner in the Huawei card | None |
| Not configured (`404`) | Text saying there is no configuration yet, with no error styling and no switch | Configurar |
| Read failed (not `404`) | An error with a retry; nothing said about the password | Reintentar |
| Configured, enabled | Username, base URL, whether a password is stored; the switch on | Switch, Editar |
| Configured, disabled | As above, the switch off, and text saying the integration is disabled | Switch, Editar |
| Enable refused (`HUAWEI_CONFIG_INCOMPLETE`) | The switch off and a message naming the missing fields | Completar configuración, Editar |
| Form (create or edit) | A dialog that fills the screen on a phone, with no `enabled` control | Guardar, Cancelar |

## Accepted exceptions

None.
