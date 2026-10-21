import { describe, it, expect } from "vitest";
import { apiError } from "../test/apiError";
import { supplyDeletionRefusal, supplyDeletionRefusalMessage } from "./supplyErrors";

describe("supply deletion refusals (#290)", () => {
  it.each([
    ["SUPPLY_HAS_PLANTS", "has-plants", "tiene una planta asociada"],
    ["SUPPLY_HAS_PARTITION_COEFFICIENTS", "has-coefficients", "forma parte de un acuerdo de reparto"],
  ] as const)("UI-SUP-004 a 409 %s recommends disabling the supply", (code, refusal, reason) => {
    const error = apiError(409, { code });

    expect(supplyDeletionRefusal(error)).toBe(refusal);
    const message = supplyDeletionRefusalMessage(error);
    expect(message).toContain(reason);
    expect(message).toContain("deshabilítalo con «Deshabilitar»");
  });

  it("UI-SUP-004 gives a 403 its own message", () => {
    const error = apiError(403);

    expect(supplyDeletionRefusal(error)).toBe("forbidden");
    expect(supplyDeletionRefusalMessage(error)).toBe("No tienes permiso para eliminar este punto de suministro.");
  });

  it("UI-SUP-004 gives a 404 its own message, saying the list was refreshed", () => {
    const error = apiError(404);

    expect(supplyDeletionRefusal(error)).toBe("not-found");
    expect(supplyDeletionRefusalMessage(error)).toBe(
      "Este punto de suministro ya no existe. Hemos actualizado la lista.",
    );
  });

  it.each([
    ["a 500", apiError(500)],
    ["a 409 with another code", apiError(409, { code: "SUPPLY_CUPS_COLLISION" })],
    ["an error with no response", new Error("Network Error")],
  ])("UI-SUP-004 gives %s the generic message", (_, error) => {
    expect(supplyDeletionRefusal(error)).toBe("other");
    expect(supplyDeletionRefusalMessage(error)).toBe(
      "No se ha podido eliminar el punto de suministro. Inténtalo de nuevo.",
    );
  });
});
