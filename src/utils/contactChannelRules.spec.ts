import { describe, expect, it } from "vitest";
import {
  CONTACT_CHANNEL_MESSAGES,
  toContactChannelBodies,
  validateChannel,
  type ContactChannelDraft,
} from "./contactChannelRules";

const channel = (overrides: Partial<ContactChannelDraft> = {}): ContactChannelDraft => ({
  type: "ADDRESS",
  label: "Oficina",
  value: "Carrer de la Pau 12, València",
  schedule: "",
  notes: "",
  ...overrides,
});

describe("validateChannel", () => {
  it("accepts a channel that meets every rule", () => {
    expect(validateChannel(channel())).toEqual({});
  });

  it("trims before checking, so text made only of spaces is blank", () => {
    expect(validateChannel(channel({ label: "   ", value: " \t " }))).toEqual({
      label: "Escribe un nombre para el canal, por ejemplo «Oficina».",
      value: "Escribe una dirección.",
    });
  });

  it.each([
    ["PHONE", "Escribe un número de teléfono."],
    ["EMAIL", "Escribe un email."],
    ["ADDRESS", "Escribe una dirección."],
  ] as const)("asks for the value of a blank %s by its own name", (type, message) => {
    expect(validateChannel(channel({ type, value: "" })).value).toBe(message);
  });

  it.each([
    ["label", 60, "El nombre puede tener hasta 60 caracteres. Ahora tiene 61."],
    ["value", 200, "Puede tener hasta 200 caracteres. Ahora tiene 201."],
    ["schedule", 200, "El horario puede tener hasta 200 caracteres. Ahora tiene 201."],
    ["notes", 500, "Las notas pueden tener hasta 500 caracteres. Ahora tienen 501."],
  ] as const)("holds %s to %i characters after trimming, and says how many it has", (field, limit, message) => {
    expect(validateChannel(channel({ [field]: ` ${"a".repeat(limit)} ` }))[field]).toBeUndefined();
    expect(validateChannel(channel({ [field]: ` ${"a".repeat(limit + 1)} ` }))[field]).toBe(message);
  });

  it("leaves the current length out of a length message when it is not known", () => {
    expect(CONTACT_CHANNEL_MESSAGES.labelTooLong()).toBe("El nombre puede tener hasta 60 caracteres.");
  });

  it("checks an email's shape only on an EMAIL channel", () => {
    expect(validateChannel(channel({ type: "EMAIL", value: "hola@solcomun" })).value).toBe(
      "Revisa el email: debe tener la forma nombre@dominio.es.",
    );
    expect(validateChannel(channel({ type: "EMAIL", value: " hola@solcomun.test " })).value).toBeUndefined();
    expect(validateChannel(channel({ type: "ADDRESS", value: "hola@solcomun" })).value).toBeUndefined();
  });

  it.each(["+34 600 111 222", "600111", "+ 600 111"])("accepts the phone %s", (value) => {
    expect(validateChannel(channel({ type: "PHONE", value })).value).toBeUndefined();
  });

  // Both phone rules share one message (#296).
  const PHONE_INVALID = "Escribe al menos 6 cifras. Solo números, espacios y un + al principio.";

  it.each(["600-111-222", "600 111 abc", "34+600111222", "++34600111222"])(
    "refuses the characters of the phone %s",
    (value) => {
      expect(validateChannel(channel({ type: "PHONE", value })).value).toBe(PHONE_INVALID);
    },
  );

  it("counts at least six digits in a phone, spaces and + aside", () => {
    expect(validateChannel(channel({ type: "PHONE", value: "978 71" })).value).toBe(PHONE_INVALID);
  });

  it("checks no format on a value that is already too long", () => {
    expect(validateChannel(channel({ type: "EMAIL", value: "a".repeat(201) })).value).toBe(
      "Puede tener hasta 200 caracteres. Ahora tiene 201.",
    );
  });
});

describe("toContactChannelBodies", () => {
  it("keeps the order, trims every text and sends a blank schedule or notes as null", () => {
    expect(
      toContactChannelBodies([
        channel({ type: "PHONE", label: " Guardia ", value: " 600 111 222 ", schedule: "  ", notes: " Urgencias " }),
        channel({ type: "EMAIL", label: "Correo", value: "hola@solcomun.test", schedule: " De 9 a 14 ", notes: "" }),
      ]),
    ).toEqual([
      { type: "PHONE", label: "Guardia", value: "600 111 222", schedule: null, notes: "Urgencias" },
      { type: "EMAIL", label: "Correo", value: "hola@solcomun.test", schedule: "De 9 a 14", notes: null },
    ]);
  });
});
