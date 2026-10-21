import { describe, it, expect } from "vitest";
import { apiError } from "../test/apiError";
import { plantDeletionRefusalMessage } from "./plantErrors";

describe("plant deletion refusals (#290)", () => {
  it.each([
    ["PLANT_HAS_SHARING_AGREEMENTS", "tiene acuerdos de reparto"],
    ["PLANT_HAS_PARTITION_COEFFICIENTS", "tiene coeficientes de reparto"],
  ] as const)("UI-PLT-008 a 409 %s says the plant must be kept, and suggests no retry", (code, reason) => {
    const message = plantDeletionRefusalMessage(apiError(409, { code }));

    expect(message).toContain(reason);
    expect(message).toContain("guarda el historial de reparto de la comunidad y hay que conservarla");
    expect(message).not.toMatch(/inténtalo/i);
  });

  it.each([
    ["a 500", apiError(500)],
    ["a 403", apiError(403)],
    ["an error with no response", new Error("Network Error")],
  ])("UI-PLT-008 keeps the generic message for %s", (_, error) => {
    expect(plantDeletionRefusalMessage(error)).toBe(
      "Ha habido un problema al eliminar la planta. Por favor inténtalo más tarde",
    );
  });
});
