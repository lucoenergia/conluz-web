import { describe, expect, it } from "vitest";
import type { ImportMembersRowErrorResponse, ImportMembersRowResponse } from "../../api/models";
import { constraintText, IMPORT_COLUMNS, MEMBER_TEMPLATE_CSV, rowReason } from "./importMembers";

const failed = (overrides: Partial<ImportMembersRowResponse>): ImportMembersRowResponse => ({
  line: 2,
  outcome: "FAILED",
  code: "MEMBERSHIP_IMPORT_ROW_INVALID",
  // The server's own wording, which the screen must never show.
  message: "TEST-SERVER-MESSAGE",
  errors: [],
  ...overrides,
});

const error = (
  column: string,
  constraint: string,
  params: Record<string, string> = {},
): ImportMembersRowErrorResponse => ({
  column,
  constraint: constraint as ImportMembersRowErrorResponse["constraint"],
  params,
});

describe("the member import's columns and template (#284)", () => {
  it("UI-MBR-019 lists exactly the six columns the backend accepts, two of them required", () => {
    expect(IMPORT_COLUMNS.map((c) => c.header)).toEqual([
      "personalId",
      "fullName",
      "memberNumber",
      "contactEmail",
      "address",
      "phoneNumber",
    ]);
    expect(IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.header)).toEqual(["personalId", "fullName"]);
  });

  it("UI-MBR-019 makes the template the header line alone, after a byte order mark", () => {
    expect(MEMBER_TEMPLATE_CSV).toBe("\uFEFFpersonalId;fullName;memberNumber;contactEmail;address;phoneNumber\r\n");
  });
});

describe("why a row was not registered (#284)", () => {
  it.each([
    ["personalId", "REQUIRED", {}, "DNI/NIE/NIF: es obligatorio."],
    ["fullName", "REQUIRED", {}, "Nombre completo: es obligatorio."],
    ["personalId", "NOT_EMPTY_ONCE_NORMALISED", {}, "DNI/NIE/NIF: solo tiene espacios, puntos o guiones."],
    ["personalId", "INVALID_PERSONAL_ID", {}, "DNI/NIE/NIF: no es un DNI, NIE o NIF válido."],
    ["memberNumber", "MIN", { min: "0" }, "Número de socio: tiene que ser 0 o mayor."],
    ["contactEmail", "EMAIL", {}, "Email de contacto: no es un email válido."],
    ["memberNumber", "NOT_AN_INTEGER", {}, "Número de socio: tiene que ser un número entero."],
  ] as const)("UI-MBR-023 words %s %s in Spanish", (column, constraint, params, text) => {
    expect(constraintText(error(column, constraint, params))).toBe(text);
  });

  it("UI-MBR-023 still names the column of a constraint a newer backend adds", () => {
    expect(constraintText(error("contactEmail", "TOO_LONG"))).toBe("Email de contacto: no es válido.");
  });

  it("UI-MBR-023 names an unknown column by its header", () => {
    expect(constraintText(error("nickname", "REQUIRED"))).toBe("nickname: es obligatorio.");
  });

  it("UI-MBR-023 lists every invalid column of a row, in the order the backend gives them", () => {
    const reason = rowReason(
      failed({
        errors: [
          error("fullName", "REQUIRED"),
          error("memberNumber", "NOT_AN_INTEGER"),
          error("contactEmail", "EMAIL"),
        ],
      }),
    );

    expect(reason).toBe(
      "Nombre completo: es obligatorio. Número de socio: tiene que ser un número entero. Email de contacto: no es un email válido.",
    );
  });

  it.each([
    ["MEMBERSHIP_ALREADY_EXISTS", "Ya es miembro de la comunidad."],
    ["MEMBERSHIP_IMPORT_ROW_MALFORMED", "La fila no tiene el mismo número de columnas que la cabecera."],
  ] as const)("UI-MBR-023 words the row code %s in Spanish", (code, text) => {
    expect(rowReason(failed({ code }))).toBe(text);
  });

  it("UI-MBR-023 words an invalid DNI/NIE/NIF from its errors", () => {
    const row = failed({ code: "USER_PERSONAL_ID_INVALID", errors: [error("personalId", "INVALID_PERSONAL_ID")] });

    expect(rowReason(row)).toBe("DNI/NIE/NIF: no es un DNI, NIE o NIF válido.");
  });

  it("UI-MBR-023 words an invalid DNI/NIE/NIF without errors as the registration does", () => {
    expect(rowReason(failed({ code: "USER_PERSONAL_ID_INVALID" }))).toBe(
      "El DNI/NIE/NIF no es válido. Revisa los números y la letra.",
    );
  });

  it("UI-MBR-023 never shows the server's message, whatever the code", () => {
    for (const code of [
      "MEMBERSHIP_IMPORT_ROW_INVALID",
      "MEMBERSHIP_ALREADY_EXISTS",
      "MEMBERSHIP_IMPORT_ROW_MALFORMED",
      "USER_PERSONAL_ID_INVALID",
      "USER_ALREADY_EXISTS",
    ] as const) {
      expect(rowReason(failed({ code }))).not.toContain("TEST-SERVER-MESSAGE");
    }
    expect(rowReason(failed({ code: "USER_ALREADY_EXISTS" }))).toBe("No se ha podido registrar.");
  });
});
