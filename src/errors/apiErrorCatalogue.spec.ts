import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { RestErrorDetailCode } from "../api/models";
import {
  getFirstApiErrorMessage,
  getGroupedApiErrorDetails,
  getIndexedApiErrorDetails,
  translateErrorDetail,
} from "./apiErrorCatalogue";
import { MISSING_CAU_MESSAGE } from "./sharingAgreementFileCopy";
import { apiError } from "../test/apiError";

const DISTRIBUTOR_FILE_CODES: RestErrorDetailCode[] = [
  "DISTRIBUTOR_FILE_LINE_MALFORMED",
  "DISTRIBUTOR_FILE_CUPS_UNKNOWN",
  "DISTRIBUTOR_FILE_CUPS_LENGTH_INVALID",
  "DISTRIBUTOR_FILE_CUPS_DUPLICATE",
  "DISTRIBUTOR_FILE_VALUE_DECIMAL_SEPARATOR_INVALID",
  "DISTRIBUTOR_FILE_VALUE_SCALE_INVALID",
  "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID",
  "DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID",
  "DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH",
  "DISTRIBUTOR_FILE_PLANT_REGULATORY_CODE_MISSING",
];

describe("translateErrorDetail", () => {
  it("returns the fallback when detail is null or undefined", () => {
    expect(translateErrorDetail(null, "fallback")).toBe("fallback");
    expect(translateErrorDetail(undefined, "fallback")).toBe("fallback");
  });

  it("returns the registered Spanish template for a known code", () => {
    expect(
      translateErrorDetail({ message: "not draft", code: "SHARING_AGREEMENT_NOT_DRAFT" }, "fallback"),
    ).toBe("Este acuerdo ya no está en borrador, así que esta acción no está disponible.");
  });

  it("falls back to detail.message when code is null", () => {
    expect(translateErrorDetail({ message: "server message", code: undefined }, "fallback")).toBe("server message");
  });

  it("falls back to detail.message when code has no registered template", () => {
    // Not in the generated enum, as when the backend adds a code before the
    // client is regenerated, so cataloguing a real code can never turn this
    // into a test of a translation.
    const unknownCode = "CODE_UNKNOWN_TO_THIS_CLIENT" as RestErrorDetailCode;
    expect(translateErrorDetail({ message: "server message", code: unknownCode }, "fallback")).toBe("server message");
  });

  it("UI-AGR-013 sends a refused generation for a plant with no CAU to the plant, in the words the panels use", () => {
    expect(
      translateErrorDetail({ message: "server message", code: "PLANT_MISSING_REGULATORY_CODE" }, "fallback"),
    ).toBe(MISSING_CAU_MESSAGE);
  });

  it("falls back to the fallback when code is unrecognised and message is empty", () => {
    expect(translateErrorDetail({ message: "", code: undefined }, "fallback")).toBe("fallback");
  });
});

describe("getFirstApiErrorMessage", () => {
  it("translates the first detail from a RestError response", () => {
    const error = {
      response: {
        data: {
          errors: [{ message: "not draft", code: "SHARING_AGREEMENT_NOT_DRAFT" }],
        },
      },
    };
    expect(getFirstApiErrorMessage(error, "fallback")).toBe(
      "Este acuerdo ya no está en borrador, así que esta acción no está disponible.",
    );
  });

  it("returns the fallback when there is no RestError body", () => {
    expect(getFirstApiErrorMessage(new Error("network error"), "fallback")).toBe("fallback");
    expect(getFirstApiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("returns the fallback when errors array is empty", () => {
    const error = { response: { data: { errors: [] } } };
    expect(getFirstApiErrorMessage(error, "fallback")).toBe("fallback");
  });
});

describe("distributor-file and sharing-agreement error templates", () => {
  it.each(DISTRIBUTOR_FILE_CODES)("translates %s to a non-empty Spanish message, distinct from the raw server message", (code) => {
    const message = translateErrorDetail({ message: "raw server message", code, params: { line: "3", cups: "ES1234" } }, "fallback");
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("interpolates the actual filename into DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID, with no leftover placeholder", () => {
    const message = translateErrorDetail(
      {
        message: "raw server message",
        code: "DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID",
        params: { filename: "ABC123_2025.txt" },
      },
      "fallback",
    );
    expect(message).toContain("ABC123_2025.txt");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("interpolates expected/actual into DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH, with no leftover placeholder", () => {
    const message = translateErrorDetail(
      {
        message: "raw server message",
        code: "DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH",
        params: { expected: "ES0031406319070001XX", actual: "ES0031406319070002YY" },
      },
      "fallback",
    );
    expect(message).toContain("ES0031406319070001XX");
    expect(message).toContain("ES0031406319070002YY");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("translates SHARING_AGREEMENT_HAS_NO_COEFFICIENTS to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_HAS_NO_COEFFICIENTS" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_NOT_PUBLISHED to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_NOT_PUBLISHED" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_NOT_REVERTIBLE to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_NOT_REVERTIBLE" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_HAS_APPLIED_COEFFICIENTS to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_HAS_APPLIED_COEFFICIENTS" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_NOT_PUBLISHED and SHARING_AGREEMENT_NOT_REVERTIBLE distinctly, since either may be the real revert-to-draft 'not PUBLISHED' code", () => {
    const notPublished = translateErrorDetail({ message: "raw", code: "SHARING_AGREEMENT_NOT_PUBLISHED" }, "fallback");
    const notRevertible = translateErrorDetail({ message: "raw", code: "SHARING_AGREEMENT_NOT_REVERTIBLE" }, "fallback");
    expect(notPublished).not.toBe(notRevertible);
  });

  it("translates SHARING_AGREEMENT_DUPLICATE_SUPPLY distinctly from DISTRIBUTOR_FILE_CUPS_DUPLICATE", () => {
    const manual = translateErrorDetail(
      { message: "raw", code: "SHARING_AGREEMENT_DUPLICATE_SUPPLY" },
      "fallback",
    );
    const fromFile = translateErrorDetail(
      { message: "raw", code: "DISTRIBUTOR_FILE_CUPS_DUPLICATE", params: { line: "1", cups: "ES1" } },
      "fallback",
    );
    expect(manual).not.toBe(fromFile);
  });
});

const LIFECYCLE_CODES: RestErrorDetailCode[] = [
  "SHARING_AGREEMENT_DATE_IN_FUTURE",
  "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
  "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_BEFORE_SUCCESSOR",
  "SHARING_AGREEMENT_CLOSURE_DATE_NOT_AFTER_ACTIVATION",
  "SHARING_AGREEMENT_COEFFICIENT_NOT_ACTIVE",
  "SHARING_AGREEMENT_COEFFICIENT_HAS_SUCCESSOR",
  "SHARING_AGREEMENT_COEFFICIENT_NOT_IN_AGREEMENT",
  "SHARING_AGREEMENT_COEFFICIENT_PERIOD_OVERLAP",
];

describe("coefficient-lifecycle error templates (activate/deactivate/close/reopen)", () => {
  it.each(LIFECYCLE_CODES)("translates %s to a non-empty Spanish message naming the supply when params.cups is present", (code) => {
    const withCups = translateErrorDetail({ message: "raw", code, params: { cups: "ES1234000000000001JN0F" } }, "fallback");
    const withoutCups = translateErrorDetail({ message: "raw", code }, "fallback");

    expect(withCups).not.toBe("");
    expect(withCups).not.toBe("raw");
    expect(withCups).toContain("ES1234000000000001JN0F");

    expect(withoutCups).not.toBe("");
    expect(withoutCups).not.toBe("raw");
    // The two variants must differ (the cups-present one names the supply)
    // but neither may ever leak a literal, un-substituted placeholder.
    expect(withoutCups).not.toBe(withCups);
  });

  it.each(LIFECYCLE_CODES)("never renders a literal {cups} placeholder for %s when params.cups is absent", (code) => {
    const message = translateErrorDetail({ message: "raw", code }, "fallback");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it.each(LIFECYCLE_CODES)("never renders a literal {cups} placeholder for %s when params is present but cups is empty", (code) => {
    const message = translateErrorDetail({ message: "raw", code, params: { coefficientId: "c1" } }, "fallback");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("a batch rejection with three lifecycle details renders three distinct messages, not one", () => {
    const error = {
      response: {
        data: {
          errors: [
            {
              message: "raw",
              code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
              params: { cups: "ES1111111111111111AA", coefficientId: "c1" },
            },
            {
              message: "raw",
              code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
              params: { cups: "ES2222222222222222BB", coefficientId: "c2" },
            },
            { message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE", params: { coefficientId: "c3" } },
          ],
        },
      },
    };
    // No detail carries params.line, so every one lands in the flat
    // "ungrouped" fileLevel bucket — exactly the N-details -> N-messages
    // list a batch rejection needs.
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.fileLevel).toHaveLength(3);
    expect(grouped.lineLevel).toHaveLength(0);
    expect(new Set(grouped.fileLevel).size).toBe(3);
  });

  it("translates SHARING_AGREEMENT_COEFFICIENT_OVERLAP_CONFLICT to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_COEFFICIENT_OVERLAP_CONFLICT" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });
});

describe("getGroupedApiErrorDetails", () => {
  it("partitions details by the presence of params.line", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "2" } },
          ],
        },
      },
    };
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.fileLevel).toHaveLength(1);
    expect(grouped.lineLevel).toHaveLength(1);
    expect(grouped.lineLevel[0].line).toBe(2);
  });

  it("orders line-level entries numerically, not lexicographically (line 10 after line 9)", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "10" } },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "2" } },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "9" } },
          ],
        },
      },
    };
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.lineLevel.map((entry) => entry.line)).toEqual([2, 9, 10]);
  });

  it("does not throw and still renders an entry whose params.line is missing entirely (grouped as file-level)", () => {
    const error = {
      response: {
        data: {
          errors: [{ message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: {} }],
        },
      },
    };
    expect(() => getGroupedApiErrorDetails(error)).not.toThrow();
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.fileLevel).toHaveLength(1);
    expect(grouped.lineLevel).toHaveLength(0);
  });

  it("does not throw and still renders an entry whose params.line is unparseable, sorted to the end of line-level", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "not-a-number" } },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "1" } },
          ],
        },
      },
    };
    expect(() => getGroupedApiErrorDetails(error)).not.toThrow();
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.lineLevel.map((entry) => entry.line)).toEqual([1, null]);
  });

  it("returns empty groups when there is no RestError body", () => {
    expect(getGroupedApiErrorDetails(new Error("network error"))).toEqual({ fileLevel: [], lineLevel: [] });
  });
});

describe("integration enable refusals (*_CONFIG_INCOMPLETE)", () => {
  it.each(["DATADIS_CONFIG_INCOMPLETE", "HUAWEI_CONFIG_INCOMPLETE"] as const)(
    "%s names the missing fields in Spanish, in the order sent",
    (code) => {
      expect(
        translateErrorDetail({ message: "Incomplete", code, params: { missingFields: "username,password" } }, "fallback"),
      ).toBe("Faltan datos para activar la integración: usuario y contraseña.");
    },
  );

  it.each(["DATADIS_CONFIG_INCOMPLETE", "HUAWEI_CONFIG_INCOMPLETE"] as const)(
    "%s without params still says data is missing, with no placeholder",
    (code) => {
      expect(translateErrorDetail({ message: "Incomplete", code }, "fallback")).toBe(
        "Faltan datos para activar la integración.",
      );
    },
  );
});

describe("personal ID refusals (#276)", () => {
  it("translates USER_PERSONAL_ID_INVALID", () => {
    expect(translateErrorDetail({ message: "raw", code: "USER_PERSONAL_ID_INVALID" }, "fallback")).toBe(
      "El DNI/NIE/NIF no es válido. Revisa los números y la letra.",
    );
  });
});

describe("energy metrics period refusals (#324)", () => {
  // Read from the contract rather than listed by hand, so a period code the
  // server adds later fails here until it has an entry.
  const contractPeriodCodes = (): string[] => {
    const spec = JSON.parse(readFileSync("api-docs.json", "utf8")) as {
      components: { schemas: { RestErrorDetail: { properties: { code: { enum: string[] } } } } };
    };
    return spec.components.schemas.RestErrorDetail.properties.code.enum.filter((code) =>
      code.startsWith("ENERGY_METRICS_PERIOD_"),
    );
  };

  it("UI-ERR-004 the contract defines the five period codes this catalogue covers", () => {
    expect(contractPeriodCodes().sort()).toEqual([
      "ENERGY_METRICS_PERIOD_CONFLICTING",
      "ENERGY_METRICS_PERIOD_INCOMPLETE",
      "ENERGY_METRICS_PERIOD_START_AFTER_END",
      "ENERGY_METRICS_PERIOD_START_IN_FUTURE",
      "ENERGY_METRICS_PERIOD_TOO_LONG",
    ]);
  });

  it.each(contractPeriodCodes())("UI-ERR-004 %s has a catalogue entry, so the server's message is never shown", (code) => {
    const message = getFirstApiErrorMessage(apiError(400, { code: code as RestErrorDetailCode }), "fallback");

    expect(message).not.toBe("raw backend message");
    expect(message).not.toBe("fallback");
  });

  it.each<[RestErrorDetailCode, string]>([
    ["ENERGY_METRICS_PERIOD_START_IN_FUTURE", "Este periodo todavía no ha empezado."],
    ["ENERGY_METRICS_PERIOD_TOO_LONG", "El periodo puede abarcar como máximo 24 meses."],
    ["ENERGY_METRICS_PERIOD_START_AFTER_END", "La fecha de inicio del periodo debe ser anterior a la de fin."],
    ["ENERGY_METRICS_PERIOD_CONFLICTING", "No se ha podido interpretar el periodo."],
    ["ENERGY_METRICS_PERIOD_INCOMPLETE", "No se ha podido interpretar el periodo: falta una de sus fechas."],
  ])("UI-ERR-001 shows %s with the catalogue's text, and without params", (code, expected) => {
    expect(getFirstApiErrorMessage(apiError(400, { code, params: null }), "fallback")).toBe(expected);
  });
});

describe("the last active admin refusal (#309)", () => {
  it("translates MEMBERSHIP_LAST_ACTIVE_ADMIN with the reason and the way forward", () => {
    expect(translateErrorDetail({ message: "raw", code: "MEMBERSHIP_LAST_ACTIVE_ADMIN" }, "fallback")).toBe(
      "Es el último administrador activo de la comunidad. Primero haz administrador a otro miembro activo.",
    );
  });
});

describe("member registration and invitation refusals (#275)", () => {
  it.each([
    ["MEMBERSHIP_ALREADY_EXISTS", "Ya forma parte de esta comunidad."],
    ["MEMBERSHIP_ALREADY_INVITED", "Este miembro ya tenía una invitación enviada."],
    ["MEMBERSHIP_NOT_INVITED", "Este miembro todavía no tiene ninguna invitación que reenviar."],
    ["MEMBERSHIP_DISABLED", "Este miembro está suspendido, así que no se le puede invitar."],
    ["MEMBERSHIP_INVITATION_UNAVAILABLE", "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."],
    [
      "MEMBERSHIP_OWNS_SUPPLIES",
      "Este miembro es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
    ],
  ] as const)("translates %s", (code, message) => {
    expect(translateErrorDetail({ message: "raw", code }, "fallback")).toBe(message);
  });

  it("words the resend limit with the wait in the body, or without one", () => {
    expect(
      translateErrorDetail(
        { message: "raw", code: "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED", params: { retryAfterSeconds: "600" } },
        "fallback",
      ),
    ).toBe("Has alcanzado el límite de reenvíos para este miembro. Podrás volver a reenviar la invitación dentro de 10 minutos.");
    expect(translateErrorDetail({ message: "raw", code: "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED" }, "fallback")).toBe(
      "Has alcanzado el límite de reenvíos para este miembro. Vuelve a intentarlo más tarde.",
    );
  });

  it("keeps the record form's wording for MEMBERSHIP_WITHOUT_CONTACT_EMAIL", () => {
    expect(translateErrorDetail({ message: "raw", code: "MEMBERSHIP_WITHOUT_CONTACT_EMAIL" }, "fallback")).toBe(
      "Un administrador de la comunidad tiene que tener un email de contacto. Para quitárselo, cámbiale antes el rol a miembro.",
    );
  });
});

describe("the contact channel codes (#296)", () => {
  const FIELD_CODES: [Exclude<RestErrorDetailCode, null>, Record<string, string>, string][] = [
    ["CONTACT_CHANNEL_LABEL_BLANK", {}, "Escribe un nombre para el canal, por ejemplo «Oficina»."],
    ["CONTACT_CHANNEL_LABEL_TOO_LONG", { maxLength: "60", n: "64" }, "El nombre puede tener hasta 60 caracteres. Ahora tiene 64."],
    ["CONTACT_CHANNEL_VALUE_BLANK", { type: "EMAIL" }, "Escribe un email."],
    ["CONTACT_CHANNEL_VALUE_BLANK", { type: "PHONE" }, "Escribe un número de teléfono."],
    ["CONTACT_CHANNEL_VALUE_BLANK", { type: "ADDRESS" }, "Escribe una dirección."],
    ["CONTACT_CHANNEL_VALUE_TOO_LONG", { maxLength: "200", n: "230" }, "Puede tener hasta 200 caracteres. Ahora tiene 230."],
    ["CONTACT_CHANNEL_SCHEDULE_TOO_LONG", { maxLength: "200", n: "201" }, "El horario puede tener hasta 200 caracteres. Ahora tiene 201."],
    ["CONTACT_CHANNEL_NOTES_TOO_LONG", { maxLength: "500", n: "512" }, "Las notas pueden tener hasta 500 caracteres. Ahora tienen 512."],
    ["CONTACT_CHANNEL_EMAIL_INVALID", {}, "Revisa el email: debe tener la forma nombre@dominio.es."],
    ["CONTACT_CHANNEL_PHONE_CHARACTERS_INVALID", {}, "Escribe al menos 6 cifras. Solo números, espacios y un + al principio."],
    ["CONTACT_CHANNEL_PHONE_TOO_FEW_DIGITS", { minDigits: "6" }, "Escribe al menos 6 cifras. Solo números, espacios y un + al principio."],
  ];

  // The server's own message follows the browser's language and numbers the
  // channels, so none of them may reach the user.
  it.each(FIELD_CODES)("words %s in Spanish, as the editor's own check of the rule (%j)", (code, params, expected) => {
    expect(translateErrorDetail({ message: "raw backend message", code, params }, "fallback")).toBe(expected);
  });

  it("leaves the current length out when the response does not carry it", () => {
    expect(
      translateErrorDetail({ message: "raw", code: "CONTACT_CHANNEL_LABEL_TOO_LONG", params: { maxLength: "60" } }, "fallback"),
    ).toBe("El nombre puede tener hasta 60 caracteres.");
  });

  it.each(["CONTACT_CHANNELS_MISSING", "CONTACT_CHANNELS_TOO_MANY", "CONTACT_CHANNEL_TYPE_INVALID"] as const)(
    "has no entry for %s, which the channel editor cannot reach",
    (code) => {
      expect(translateErrorDetail({ message: "raw backend message", code }, "fallback")).toBe("raw backend message");
    },
  );
});

describe("getIndexedApiErrorDetails", () => {
  const errorWith = (errors: unknown[]) => ({ response: { status: 400, data: { status: 400, errors } } });

  it("places a detail with an index on that item, and one without on the form", () => {
    const result = getIndexedApiErrorDetails(
      errorWith([
        { code: "CONTACT_CHANNEL_EMAIL_INVALID", message: "raw", params: { index: "2" } },
        { code: null, message: "Algo del formulario.", params: null },
        { code: "CONTACT_CHANNEL_LABEL_BLANK", message: "raw", params: { index: "0" } },
      ]),
    );

    expect(result.indexed).toEqual([
      { index: 2, code: "CONTACT_CHANNEL_EMAIL_INVALID", message: "Revisa el email: debe tener la forma nombre@dominio.es." },
      { index: 0, code: "CONTACT_CHANNEL_LABEL_BLANK", message: "Escribe un nombre para el canal, por ejemplo «Oficina»." },
    ]);
    expect(result.formLevel).toEqual(["Algo del formulario."]);
  });

  it("adds the params the form knows about the item it sent, for that item only", () => {
    const paramsFor = vi.fn((index: number) => (index === 1 ? { n: "75", type: "PHONE" } : { n: "0", type: "EMAIL" }));
    const result = getIndexedApiErrorDetails(
      errorWith([
        { code: "CONTACT_CHANNEL_LABEL_TOO_LONG", message: "raw", params: { index: "1", maxLength: "60" } },
        { code: "CONTACT_CHANNEL_VALUE_BLANK", message: "raw", params: { index: "0" } },
      ]),
      paramsFor,
    );

    expect(result.indexed.map((detail) => detail.message)).toEqual([
      "El nombre puede tener hasta 60 caracteres. Ahora tiene 75.",
      "Escribe un email.",
    ]);
    expect(paramsFor).toHaveBeenCalledWith(1, "CONTACT_CHANNEL_LABEL_TOO_LONG");
  });

  it.each(["", "abc", "-1", "1.5"])("keeps a detail whose index is %j on the form rather than dropping it", (index) => {
    const result = getIndexedApiErrorDetails(errorWith([{ code: null, message: "Algo falló.", params: { index } }]));

    expect(result).toEqual({ formLevel: ["Algo falló."], indexed: [] });
  });

  it("finds nothing in an error that is not an API response", () => {
    expect(getIndexedApiErrorDetails(new Error("network"))).toEqual({ formLevel: [], indexed: [] });
  });
});
