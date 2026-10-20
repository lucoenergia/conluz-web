# UI spec document — Invitation acceptance

| | |
| --- | --- |
| **Prefix** | `UI-INV` |
| **Status** | Active |
| **Routes** | `/accept-invitation` |
| **Roles** | Every caller, with or without a session |
| **Domain rules** | `lucoenergia/conluz`: MEM-014, MEM-015, MEM-016, MEM-017, ACC-007, OTT-008; ADR-0004 |
| **Design reference** | n/a |
| **Last reviewed against code** | #288 |

## Purpose

Let somebody invited to a community join it from the link in the invitation email,
`/accept-invitation#<token>`: by choosing the first password of a new account, or by accepting
with an account they already have, signed in or after logging in on the same screen.

The same screen serves an invitation to the platform-admin role (#288, lucoenergia/conluz
ADR-0004), which also needs a confirmation code that whoever invited gives the person by another
channel.

## Rules

### UI-INV-001 — The screen is public

- **Status:** Active
- **Rule:** The screen MUST serve a caller with or without a session, and MUST NOT redirect either
  away on arrival.
- **Rationale:** The token lives only on this screen. The redirect a signed-in caller gets from the
  login page would lose it, as it would the password-reset link's (#233).
- **Implements:** n/a
- **Source:** #274

### UI-INV-002 — The token stays in memory

- **Status:** Active
- **Rule:** The token MUST be read from the URL fragment once, during the first render, and kept in
  the screen's memory only; the fragment MUST then be removed from the address bar, and the token
  MUST NOT reach browser storage, a log or the URL.
- **Rationale:** The fragment never reaches a server log, and nothing that outlives the screen may
  hold the token. Reading it during the first render, not in the effect that clears the fragment,
  keeps it under StrictMode, which runs that effect twice.
- **Implements:** n/a
- **Source:** #274

### UI-INV-003 — A link with no token is incomplete

- **Status:** Active
- **Rule:** A link with no token, or with a bare `#`, MUST show the incomplete-link message and send
  no request.
- **Rationale:** A truncated link is a copying mistake the person can fix by opening the email
  again; asking the backend about an empty token would only spend a throttling attempt.
- **Implements:** n/a
- **Source:** #274

### UI-INV-004 — The invitation is inspected once and names what it is for

- **Status:** Active
- **Rule:** On arrival with a token the screen MUST inspect the invitation exactly once. Once it is
  answered, the heading MUST name the community of a `COMMUNITY` invitation ("Únete a {community}"),
  or say that a `PLATFORM` invitation is to administer the platform ("Únete como administrador de
  la plataforma"), naming no community.
- **Rationale:** The person sees what they are joining before choosing a password or logging in. A
  single inspection keeps StrictMode from spending two throttling attempts. A platform invitation
  has no community.
- **Implements:** MEM-014
- **Source:** #274; changed in #288 (the platform invitation's heading)

### UI-INV-005 — Every unusable token reads the same

- **Status:** Active
- **Rule:** A token refused as unusable, on inspection or on either acceptance, MUST show the same
  invalid-link message, which asks the person to have the community send the link again. Once the
  inspection has said the invitation is a `PLATFORM` one, the message MUST ask them to have whoever
  invited them send it again instead, and the screen's subtitle MUST name the platform, not a
  community.
- **Rationale:** The backend answers every unusable token alike, so the screen cannot tell an
  expired link from a used, revoked or unknown one, and does not pretend to. A platform invitation
  comes from a platform admin, not a community.
- **Implements:** MEM-015, OTT-008
- **Source:** #274; changed in #288 (maintainer decision on the platform wording)

### UI-INV-006 — A throttled request says how long to wait

- **Status:** Active
- **Rule:** A throttled request MUST show the wait in whole minutes, rounded up, and MUST keep the
  token so the same step can be tried again: a retry button after an inspection, the form or button
  after an acceptance or a login.
- **Rationale:** Throttling is temporary; the link stays usable, and a new one would not help.
- **Implements:** n/a
- **Source:** #274

### UI-INV-007 — An account without a password chooses its first one

- **Status:** Active
- **Rule:** When the invitation needs no login, the screen MUST ask for a new password and its
  confirmation, with the visible password policy and its checks before sending; on success it MUST
  revoke and end any session the browser holds, waiting for the revocation no longer than a logout
  does, and then go to the login page, which MUST show once a notice naming the community.
- **Rationale:** The invited account had no password, so any session in the browser is another
  account's, and the login page would send it on without the notice. It is revoked like any
  logout (#213), not only forgotten by the browser, and a revocation that never answers must not
  keep the person from the login page.
- **Implements:** MEM-016, ACC-007
- **Source:** #274

### UI-INV-008 — A refused password keeps the token

- **Status:** Active
- **Rule:** A new password the backend refuses MUST show the reason on the password field and keep
  the token for a corrected attempt.
- **Rationale:** A refused password is the person's to fix, not the link's.
- **Implements:** n/a
- **Source:** #274

### UI-INV-009 — An account that turns out to have a password logs in

- **Status:** Active
- **Rule:** When accepting without a login is answered that a login is required
  (`MEMBERSHIP_INVITATION_LOGIN_REQUIRED`, or `PLATFORM_ADMIN_INVITATION_LOGIN_REQUIRED` for a
  platform invitation), the screen MUST switch to the login path, keeping the token and any
  confirmation code typed.
- **Rationale:** The account gained a password after the inspection; the same link still works
  signed in.
- **Implements:** n/a
- **Source:** #274; changed in #288 (the platform invitation's code)

### UI-INV-010 — Signed in, one button accepts

- **Status:** Active
- **Rule:** When the invitation needs a login and there is a session, the screen MUST say which
  account is signed in and offer one button that accepts; on success it MUST refresh the current
  user and go to the landing, which MUST show once a notice naming the community.
- **Rationale:** The new membership lives on the current user, which decides where the landing
  sends the caller and which communities they can switch to.
- **Implements:** MEM-017
- **Source:** #274

### UI-INV-011 — A refused signed-in acceptance offers to log out

- **Status:** Active
- **Rule:** When the signed-in acceptance is refused as unusable, the screen MUST add to the
  invalid-link message an offer to log out; logging out MUST revoke the session, waiting for the
  revocation no longer than a logout does, and keep the screen and the token, so the person can log
  in on it.
- **Rationale:** An invitation for another account is answered like an unusable one, so the screen
  says what both mean and offers the way out of the first. A revocation that never answers must not
  leave the person signed in to the wrong account.
- **Implements:** MEM-017
- **Source:** #274

### UI-INV-012 — Without a session, the login happens on the screen

- **Status:** Active
- **Rule:** When the invitation needs a login and there is no session, the screen MUST offer a
  login form; after a successful login it MUST stay mounted on its route, and accept as the new
  session's user once that user has loaded. If that user cannot be loaded for a reason other than a
  refused session, the screen MUST say so and offer a retry, keeping the token.
- **Rationale:** The login page would navigate away and lose the token. Waiting for the current
  user ensures the acceptance is sent with the new session; without a retry, a failed read would
  leave the screen waiting for good. A refused session ends, as it does anywhere in the app.
- **Implements:** MEM-017
- **Source:** #274

### UI-INV-013 — A password change comes first

- **Status:** Active
- **Rule:** When the signed-in acceptance is refused because the caller must change their password,
  the screen MUST say so, say the link stays valid to open again afterwards, and link to
  `/change-password`.
- **Rationale:** The backend refuses everything but the change until it is done; the invitation is
  not consumed, so the same email link works once it is.
- **Implements:** n/a
- **Source:** #274

### UI-INV-014 — A platform invitation asks for its confirmation code on both paths

- **Status:** Active
- **Rule:**
  - When the inspection says `confirmationCodeRequired`, the screen MUST show a required
    "Código de confirmación" field on every path: with the new password, in the in-page login form,
    and above the signed-in button. When it does not, or says nothing, no code field MUST be shown
    and the acceptance bodies MUST stay exactly as without it.
  - The field MUST have `autocomplete="off"`, and MUST accept the code in any case, with spaces
    and hyphens.
  - A value that is not 8 letters or digits once spaces and hyphens are removed MUST be refused on
    the field, and nothing MUST be sent — before an in-page login, no login either.
  - The code MUST be sent, trimmed, as `confirmationCode` in the accept request, with the original
    token.
  - The code MUST be kept only in the screen's memory and in that request's body: it MUST NOT reach
    browser storage, cookies, the URL, a log or the query or mutation cache, and is gone when the
    screen closes.
- **Rationale:** The code is what proves the person is the one the inviter meant, and it never
  travels by email. Each wrong code counts against the invitation, and the fifth revokes its link,
  so a typo that cannot be a code is caught before it spends one.
- **Implements:** lucoenergia/conluz ADR-0004 §4, §5
- **Source:** #288 (the local check: maintainer decision)

### UI-INV-015 — A wrong code is shown on its field

- **Status:** Active
- **Rule:** `PLATFORM_ADMIN_INVITATION_CODE_INVALID` MUST be shown on the code field, keeping the
  token, the code and every other value typed, so the person can try again. After an in-page login
  the session MUST be kept, and the signed-in view MUST show the field with the error.
- **Rationale:** The link still works after a wrong code; only the code is the person's to fix.
- **Implements:** lucoenergia/conluz ADR-0004 §4
- **Source:** #288

### UI-INV-016 — Too many wrong codes end the invitation

- **Status:** Active
- **Rule:** `PLATFORM_ADMIN_INVITATION_CODE_ATTEMPTS_EXHAUSTED` MUST replace the form with a final
  message saying the invitation was cancelled after too many wrong codes, and to ask whoever
  invited them for a new one. No field or button to try again MUST be offered.
- **Rationale:** The fifth wrong code revokes the link; only a resend makes a new one.
- **Implements:** lucoenergia/conluz ADR-0004 §4
- **Source:** #288

### UI-INV-017 — An accepted platform invitation says so once

- **Status:** Active
- **Rule:**
  - After accepting with a new password, the login page MUST show once "Ya eres administrador de la
    plataforma. Inicia sesión con tu nueva contraseña."
  - After accepting signed in, the screen MUST refresh the current user, so its new capabilities
    apply, and the landing MUST show once "Ya eres administrador de la plataforma."
  - The flag that carries either notice MUST hold no token, code or name.
- **Rationale:** The role lives on the current user, which decides where the landing sends the
  caller. A platform invitation has no community to name.
- **Implements:** lucoenergia/conluz ADR-0004 §1
- **Source:** #288

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Inspecting | A progress indicator | Volver al inicio de sesión |
| Incomplete link | The incomplete-link message | Volver al inicio de sesión |
| Invalid link | The invalid-link message; signed in after a refused acceptance, the log-out offer too | Cerrar sesión (when offered), Volver al inicio de sesión |
| Inspection failed or throttled | The reason, or the wait in minutes | Reintentar, Volver al inicio de sesión |
| Set password | The community or the platform, the new-password form with the policy; the code field for a platform invitation | Aceptar invitación |
| Login, no session | The community or the platform, the login form; the code field for a platform invitation | Entrar y aceptar |
| Login, signed in | The community or the platform, the signed-in account; the code field for a platform invitation | Aceptar invitación |
| Login incomplete | The new session's user could not be loaded | Reintentar |
| Password change required | The explanation | Cambiar contraseña |
| Code attempts exhausted | The final message | Volver al inicio de sesión |

## Accepted exceptions

None.
