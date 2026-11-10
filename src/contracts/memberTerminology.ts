/**
 * The words the app must not use for a community member, and the one it uses:
 * "miembro" (#400). A member may be a natural person, a company or a local
 * entity, and the partner noun is a legal term that does not fit a collective
 * self-consumption scheme with no legal entity behind it. The rule is in
 * AGENTS.md ("Terminology"); src/contracts/memberTerminology.spec.ts applies it
 * to the repository.
 *
 * This module is scanned like any other, so it never spells the words out.
 */

export const MEMBER_TERM = "miembro";

/**
 * A word counts only as a whole word. JavaScript's `\b` knows ASCII alone, so
 * an accented letter would count as a boundary; these lookarounds use Unicode
 * letter and digit classes instead, and treat `_` as part of an identifier.
 */
const BEFORE = String.raw`(?<![\p{L}\p{N}_])`;
const AFTER = String.raw`(?![\p{L}\p{N}_])`;

const FORBIDDEN: RegExp[] = [
  // The partner noun, in its four forms.
  new RegExp(`${BEFORE}soci[oa]s?${AFTER}`, "giu"),
  // The person noun, except in the legal terms for a natural or legal person.
  new RegExp(`${BEFORE}person[a]s?${AFTER}(?!\\s+(?:físicas?|jurídicas?)${AFTER})`, "giu"),
];

export interface TerminologyViolation {
  file: string;
  line: number;
  word: string;
  /** The line's text, as the allow-list names it. */
  text: string;
}

/** Every forbidden word on one line, in the order they appear. */
export function findTerminologyViolations(file: string, lineNumber: number, lineText: string): TerminologyViolation[] {
  return FORBIDDEN.flatMap((pattern) => [...lineText.matchAll(pattern)].map((match) => ({ match, pattern })))
    .sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0))
    .map(({ match }) => ({ file, line: lineNumber, word: match[0], text: lineText }));
}

/**
 * A justified exception: the file, the line's exact text without its
 * indentation, and why the word stays.
 */
export interface AllowListEntry {
  file: string;
  line: string;
  reason: string;
}

const isAllowedBy = (violation: TerminologyViolation, entry: AllowListEntry) =>
  entry.file === violation.file && entry.line === violation.text.trim();

/**
 * The violations no entry allows, and the entries that allow nothing: a stale
 * entry fails too, so exceptions do not outlive the line they were made for.
 */
export function applyAllowList(
  violations: TerminologyViolation[],
  allowList: AllowListEntry[],
): { violations: TerminologyViolation[]; stale: AllowListEntry[] } {
  return {
    violations: violations.filter((violation) => !allowList.some((entry) => isAllowedBy(violation, entry))),
    stale: allowList.filter((entry) => !violations.some((violation) => isAllowedBy(violation, entry))),
  };
}

/** One line per violation, so a failure lists all of them at once. */
export function formatViolations(violations: TerminologyViolation[]): string {
  return violations
    .map(({ file, line, word }) => `${file}:${line}: "${word}" names a community member; use "${MEMBER_TERM}".`)
    .join("\n");
}

export function formatStaleEntries(stale: AllowListEntry[]): string {
  return stale
    .map(({ file, line }) => `${file}: no line "${line}" still needs this allow-list entry; remove it.`)
    .join("\n");
}
