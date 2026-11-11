import { describe, expect, it } from "vitest";
import {
  applyAllowList,
  findTerminologyViolations,
  formatStaleEntries,
  formatViolations,
  type AllowListEntry,
} from "./memberTerminology";

const FILE = "src/pages/Example.tsx";

/** Feeds a synthetic file to the checker line by line, numbering from 1. */
const check = (lines: string[], file = FILE) =>
  lines.flatMap((text, index) => findTerminologyViolations(file, index + 1, text));

const flagged = (lines: string[]) => check(lines).map(({ line, word }) => ({ line, word }));

describe("member terminology checker", () => {
  it('flags "socios" and names the file and the line', () => {
    const violations = check([
      "const title = 'Miembros';",
      "const count = `${n} socios`;",
      "// nothing to see here",
      "label: 'Los socios de la comunidad',",
    ]);

    expect(violations.map(({ file, line, word }) => ({ file, line, word }))).toEqual([
      { file: FILE, line: 2, word: "socios" },
      { file: FILE, line: 4, word: "socios" },
    ]);
    const message = formatViolations(violations);
    expect(message).toContain(`${FILE}:2`);
    expect(message).toContain(`${FILE}:4`);
    expect(message).toContain('"socios"');
    expect(message).toContain('"miembro"');
  });

  it('flags "Socia", capitalised, and the other forms of the word', () => {
    expect(flagged(["fullName: 'Ana Socia',", "Número de miembro", "SOCIO #7", "las socias", "un socio más"])).toEqual([
      { line: 1, word: "Socia" },
      { line: 3, word: "SOCIO" },
      { line: 4, word: "socias" },
      { line: 5, word: "socio" },
    ]);
  });

  it('passes "asociación" and "sociedad", which only contain the letters', () => {
    expect(
      flagged([
        "La asociación de vecinos",
        "Una sociedad limitada",
        "Los socios de la asociación",
        "asociaciones, sociedades y socias",
        "Asociación",
      ]),
    ).toEqual([
      { line: 3, word: "socios" },
      { line: 4, word: "socias" },
    ]);
  });

  it('passes "persona jurídica" and "Personas físicas", the legal terms', () => {
    expect(
      flagged([
        "Puede ser una persona jurídica.",
        "Personas físicas y jurídicas",
        "Una persona de la comunidad",
        "persona física o persona jurídica",
        "Avisa a esta persona.",
      ]),
    ).toEqual([
      { line: 3, word: "persona" },
      { line: 5, word: "persona" },
    ]);
  });

  it('passes "Persona Jurídica", in any case', () => {
    expect(flagged(["Persona Jurídica", "PERSONAS FÍSICAS", "Persona Física con persona"])).toEqual([
      { line: 3, word: "persona" },
    ]);
  });

  it('flags "las personas de tu comunidad"', () => {
    expect(
      flagged(["Invita a las personas de tu comunidad.", "Invita a los miembros de tu comunidad.", "personas"]),
    ).toEqual([
      { line: 1, word: "personas" },
      { line: 3, word: "personas" },
    ]);
  });

  it("does not take a word joined to a digit or an underscore", () => {
    expect(
      flagged(["const socio_number = 1;", "const persona2 = build();", "socio 2", "persona_id, personas"]),
    ).toEqual([
      { line: 3, word: "socio" },
      { line: 4, word: "personas" },
    ]);
  });

  it("does not take the legal term when only part of it follows", () => {
    expect(flagged(["persona físicamente presente", "persona jurídicas", "personas jurídicamente"])).toEqual([
      { line: 1, word: "persona" },
      { line: 3, word: "personas" },
    ]);
  });

  it("reports every word on a line, in order", () => {
    expect(flagged(["socio, persona y socia"])).toEqual([
      { line: 1, word: "socio" },
      { line: 1, word: "persona" },
      { line: 1, word: "socia" },
    ]);
  });

  it("passes an allow-listed line, and only that line", () => {
    const violations = [
      ...check(["  Esta persona es administradora.", "Los socios", "Esta persona también"], "src/a.ts"),
      ...check(["  Esta persona es administradora."], "src/b.ts"),
    ];
    const allowList: AllowListEntry[] = [
      { file: "src/a.ts", line: "Esta persona es administradora.", reason: "an admin, not a member" },
    ];

    const result = applyAllowList(violations, allowList);

    expect(result.violations.map(({ file, line, word }) => ({ file, line, word }))).toEqual([
      { file: "src/a.ts", line: 2, word: "socios" },
      { file: "src/a.ts", line: 3, word: "persona" },
      { file: "src/b.ts", line: 1, word: "persona" },
    ]);
    expect(result.stale).toEqual([]);
  });

  it("fails a stale allow-list entry, whose line no longer exists", () => {
    const violations = check(["Esta persona es administradora.", "Dáselo en persona."], "src/a.ts");
    const kept = { file: "src/a.ts", line: "Esta persona es administradora.", reason: "an admin" };
    const gone = { file: "src/a.ts", line: "Esta persona era administradora.", reason: "rewritten since" };
    const moved = { file: "src/c.ts", line: "Dáselo en persona.", reason: "the file is another" };

    const result = applyAllowList(violations, [kept, gone, moved]);

    expect(result.stale).toEqual([gone, moved]);
    expect(result.violations.map(({ line }) => line)).toEqual([2]);
    const message = formatStaleEntries(result.stale);
    expect(message).toContain("Esta persona era administradora.");
    expect(message).toContain("src/c.ts");
  });
});
