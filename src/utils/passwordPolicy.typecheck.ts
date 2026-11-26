/**
 * UI-FRM-006: COMPROMISED is the server's to decide. checkPasswordPolicy may
 * return only the rules the client can evaluate, so it must never be able to
 * return COMPROMISED. That guarantee is only real if something checks it, so
 * it lives here and `tsc -b` re-proves it on every build.
 *
 * Nothing imports this file; it exists to be type-checked.
 */
import { checkPasswordPolicy } from "./passwordPolicy";

type ClientCheckResult = NonNullable<ReturnType<typeof checkPasswordPolicy>>;

// The client's own rules compile.
export const tooShort: ClientCheckResult = "TOO_SHORT";

// @ts-expect-error UI-FRM-006: checkPasswordPolicy never returns COMPROMISED.
export const compromised: ClientCheckResult = "COMPROMISED";
