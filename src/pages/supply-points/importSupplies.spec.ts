import { describe, expect, it } from "vitest";
import type { ImportSuppliesRowResponse, RestErrorDetailCode } from "../../api/models";
import {
  SUPPLY_IMPORT_COLUMNS,
  SUPPLY_TEMPLATE_CSV,
  supplyImportSummaryOf,
  supplyRowReason,
} from "./importSupplies";

const failed = (overrides: Partial<ImportSuppliesRowResponse>): ImportSuppliesRowResponse => ({
  line: 2,
  outcome: "FAILED",
  code: "SUPPLY_IMPORT_ROW_INVALID",
  message: "TEST-SERVER-MESSAGE",
  errors: [],
  ...overrides,
});

describe("the supply import's columns", () => {
  it("UI-SUP-007 lists the five columns the backend accepts, the three required ones first", () => {
    expect(SUPPLY_IMPORT_COLUMNS.map((column) => [column.header, column.required])).toEqual([
      ["code", true],
      ["address", true],
      ["personalId", true],
      ["addressRef", false],
      ["name", false],
    ]);
  });

  it("UI-SUP-007 makes the template the header line alone, after a byte order mark, as the member template", () => {
    expect(SUPPLY_TEMPLATE_CSV).toBe("\uFEFFcode;address;personalId;addressRef;name\r\n");
  });
});

describe("why a row was not created", () => {
  it.each<[RestErrorDetailCode, string]>([
    ["SUPPLY_ALREADY_EXISTS", "Ya hay un punto de suministro con este CUPS en la comunidad."],
    ["SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY", "Este CUPS ya está registrado en otra comunidad."],
    ["SUPPLY_OWNER_NOT_FOUND", "No hay ningún miembro de la comunidad con ese DNI/NIE/NIF."],
    ["SUPPLY_IMPORT_ROW_MALFORMED", "La fila no tiene el mismo número de columnas que la cabecera."],
  ])("UI-SUP-008 words the row code %s in Spanish", (code, reason) => {
    expect(supplyRowReason(failed({ code }))).toBe(reason);
  });

  it("UI-SUP-008 words an invalid CUPS", () => {
    const row = failed({ errors: [{ column: "code", constraint: "INVALID_CUPS", params: {} }] });

    expect(supplyRowReason(row)).toBe("CUPS: tiene que tener 20 o 22 caracteres, sin espacios.");
  });

  it("UI-SUP-008 names each empty required column by its label, in the order the backend gives them", () => {
    const row = failed({
      errors: [
        { column: "address", constraint: "REQUIRED", params: {} },
        { column: "personalId", constraint: "REQUIRED", params: {} },
      ],
    });

    expect(supplyRowReason(row)).toBe("Dirección: es obligatorio. DNI/NIE/NIF: es obligatorio.");
  });

  it("UI-SUP-008 names an unknown column by its header", () => {
    const row = failed({ errors: [{ column: "meter", constraint: "REQUIRED", params: {} }] });

    expect(supplyRowReason(row)).toBe("meter: es obligatorio.");
  });

  it("UI-SUP-008 falls back to the server's message for a constraint a newer backend adds", () => {
    const row = failed({
      errors: [
        { column: "address", constraint: "REQUIRED", params: {} },
        // A constraint this client does not know yet, as the contract warns.
        { column: "addressRef", constraint: "INVALID_CADASTRAL_REFERENCE" as never, params: {} },
      ],
    });

    expect(supplyRowReason(row)).toBe("TEST-SERVER-MESSAGE");
  });

  it("UI-SUP-008 falls back to the server's message for a code it does not know", () => {
    expect(supplyRowReason(failed({ code: "SUPPLY_HAS_PLANTS" }))).toBe("TEST-SERVER-MESSAGE");
  });

  it("UI-SUP-008 says only that the row was not created when the server gives no message either", () => {
    expect(supplyRowReason(failed({ code: "SUPPLY_HAS_PLANTS", message: null }))).toBe("No se ha podido crear.");
  });
});

describe("what the import did", () => {
  it.each<[number, number, string]>([
    [3, 0, "Se han creado 3 puntos de suministro."],
    [1, 0, "Se ha creado 1 punto de suministro."],
    [2, 1, "Se han creado 2 puntos de suministro. 1 fila tiene errores."],
    [0, 4, "No se ha creado ningún punto de suministro. 4 filas tienen errores."],
  ])("UI-SUP-008 words %i created and %i failed", (created, failedRows, summary) => {
    expect(supplyImportSummaryOf({ created, failed: failedRows, rows: [] })).toBe(summary);
  });
});
