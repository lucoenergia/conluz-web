import { describe, it, expect } from "vitest";
import { apiError } from "../test/apiError";
import {
  INVITATIONS_UNAVAILABLE_MESSAGE,
  isPlatformInvitationStaleRow,
  platformInvitationWriteMessage,
} from "./platformAdminErrors";

const REFRESHED = "Hemos actualizado la lista.";

describe("platform-admin invitation refusals (#288)", () => {
  it.each([
    ["invite", "USER_ALREADY_PLATFORM_ADMIN", 409, true],
    ["invite", "PLATFORM_ADMIN_ALREADY_INVITED", 409, true],
    ["invite", "USER_PERSONAL_ID_INVALID", 400, false],
    ["invite", "PLATFORM_ADMIN_INVITATION_UNAVAILABLE", 503, false],
    ["resend", "PLATFORM_ADMIN_NOT_INVITED", 409, true],
    ["resend", "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED", 429, false],
    ["revoke", "PLATFORM_ADMIN_NOT_INVITED", 409, true],
  ] as const)("a refused %s with %s is stale: %s", (write, code, status, stale) => {
    expect(isPlatformInvitationStaleRow(apiError(status, { code }), write)).toBe(stale);
  });

  it("reads a 404 on a row as stale, and never on the invite, which names no row", () => {
    expect(isPlatformInvitationStaleRow(apiError(404), "resend")).toBe(true);
    expect(isPlatformInvitationStaleRow(apiError(404), "revoke")).toBe(true);
    expect(isPlatformInvitationStaleRow(apiError(404), "invite")).toBe(false);
  });

  it("gives the resend limit's wait from the Retry-After header, worded for an admin", () => {
    const error = apiError(429, { code: "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED" }, { "retry-after": "7200" });

    expect(platformInvitationWriteMessage(error, "resend")).toBe(
      "Has alcanzado el límite de reenvíos para este administrador. Podrás volver a reenviar la invitación dentro de 2 horas.",
    );
  });

  it("gives the resend limit's wait from the body, and says later without one", () => {
    const withBody = apiError(429, {
      code: "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED",
      params: { retryAfterSeconds: "600" },
    });
    const without = apiError(429, { code: "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED" });

    expect(platformInvitationWriteMessage(withBody, "resend")).toContain("dentro de 10 minutos.");
    expect(platformInvitationWriteMessage(without, "resend")).toBe(
      "Has alcanzado el límite de reenvíos para este administrador. Vuelve a intentarlo más tarde.",
    );
  });

  it.each(["resend", "revoke"] as const)("says a stale %s refreshed the list", (write) => {
    expect(platformInvitationWriteMessage(apiError(409, { code: "PLATFORM_ADMIN_NOT_INVITED" }), write)).toBe(
      `Esta persona ya no tiene una invitación pendiente. ${REFRESHED}`,
    );
    expect(platformInvitationWriteMessage(apiError(404), write)).toBe(`Esta cuenta ya no existe. ${REFRESHED}`);
  });

  it("says invitations cannot be sent right now on a 503, with or without its code", () => {
    expect(platformInvitationWriteMessage(apiError(503, { code: "PLATFORM_ADMIN_INVITATION_UNAVAILABLE" }), "resend")).toBe(
      INVITATIONS_UNAVAILABLE_MESSAGE,
    );
    expect(platformInvitationWriteMessage(apiError(503), "resend")).toBe(INVITATIONS_UNAVAILABLE_MESSAGE);
  });

  it("falls back to a message per write", () => {
    expect(platformInvitationWriteMessage(apiError(500), "resend")).toBe(
      "No se ha podido reenviar la invitación. Inténtalo de nuevo.",
    );
    expect(platformInvitationWriteMessage(apiError(500), "revoke")).toBe(
      "No se ha podido revocar el enlace. Inténtalo de nuevo.",
    );
  });
});
