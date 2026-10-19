# UI spec document — Invitation acceptance

| | |
| --- | --- |
| **Prefix** | `UI-INV` |
| **Status** | Active |
| **Routes** | `/accept-invitation` |
| **Roles** | Every caller, with or without a session |
| **Domain rules** | `lucoenergia/conluz`: MEM-014, MEM-015, MEM-016, MEM-017, ACC-007, OTT-008 |
| **Design reference** | n/a |
| **Last reviewed against code** | #274 |

## Purpose

Let somebody invited to a community join it from the link in the invitation email,
`/accept-invitation#<token>`: by choosing the first password of a new account, or by accepting
with an account they already have, signed in or after logging in on the same screen.

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

### UI-INV-004 — The invitation is inspected once and names its community

- **Status:** Active
- **Rule:** On arrival with a token the screen MUST inspect the invitation exactly once, and once
  it is answered MUST name the community in its heading.
- **Rationale:** The person sees what they are joining before choosing a password or logging in. A
  single inspection keeps StrictMode from spending two throttling attempts.
- **Implements:** MEM-014
- **Source:** #274

### UI-INV-005 — Every unusable token reads the same

- **Status:** Active
- **Rule:** A token refused as unusable, on inspection or on either acceptance, MUST show the same
  invalid-link message, which asks the person to have the community send the link again.
- **Rationale:** The backend answers every unusable token alike, so the screen cannot tell an
  expired link from a used, revoked or unknown one, and does not pretend to.
- **Implements:** MEM-015, OTT-008
- **Source:** #274

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
- **Rule:** When accepting without a login is answered that a login is required, the screen MUST
  switch to the login path, keeping the token.
- **Rationale:** The account gained a password after the inspection; the same link still works
  signed in.
- **Implements:** n/a
- **Source:** #274

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

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Inspecting | A progress indicator | Volver al inicio de sesión |
| Incomplete link | The incomplete-link message | Volver al inicio de sesión |
| Invalid link | The invalid-link message; signed in after a refused acceptance, the log-out offer too | Cerrar sesión (when offered), Volver al inicio de sesión |
| Inspection failed or throttled | The reason, or the wait in minutes | Reintentar, Volver al inicio de sesión |
| Set password | The community, the new-password form with the policy | Aceptar invitación |
| Login, no session | The community, the login form | Entrar y aceptar |
| Login, signed in | The community, the signed-in account | Aceptar invitación |
| Login incomplete | The new session's user could not be loaded | Reintentar |
| Password change required | The explanation | Cambiar contraseña |

## Accepted exceptions

None.
