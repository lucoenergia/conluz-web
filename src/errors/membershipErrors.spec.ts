import { describe, expect, it } from "vitest";
import { apiError } from "../test/apiError";
import {
  invitationRefusalMessage,
  removalRefusalMessage,
  roleChangeRefusalMessage,
  STALE_ROW_CODES,
} from "./membershipErrors";
import { resendLimitMessage } from "./membershipErrorMessages";

const REFRESHED = "Hemos actualizado la lista.";

describe("invitationRefusalMessage (#275)", () => {
  it("UI-MBR-014 points a refusal for want of a contact email to the record edit", () => {
    expect(invitationRefusalMessage(apiError(400, { code: "MEMBERSHIP_WITHOUT_CONTACT_EMAIL" }), "invite")).toBe(
      "Este miembro no tiene email de contacto. Añádelo desde «Editar ficha» y vuelve a intentarlo.",
    );
  });

  it("UI-MBR-014 says the member is suspended, and that the list was refreshed", () => {
    expect(invitationRefusalMessage(apiError(409, { code: "MEMBERSHIP_DISABLED" }), "resend")).toBe(
      `Este miembro está suspendido, así que no se le puede invitar. ${REFRESHED}`,
    );
  });

  it("UI-MBR-014 says invitations cannot be sent right now", () => {
    expect(invitationRefusalMessage(apiError(503, { code: "MEMBERSHIP_INVITATION_UNAVAILABLE" }), "bulk")).toBe(
      "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde.",
    );
  });

  it("UI-MBR-014 reads the wait before another resend from the Retry-After header", () => {
    const error = apiError(429, { code: "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED" }, { "retry-after": "7200" });
    expect(invitationRefusalMessage(error, "resend")).toBe(
      "Has alcanzado el límite de reenvíos para este miembro. Podrás volver a reenviar la invitación dentro de 2 horas.",
    );
  });

  it("UI-MBR-014 reads the wait before another resend from params.retryAfterSeconds", () => {
    const error = apiError(429, {
      code: "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED",
      params: { retryAfterSeconds: "1500" },
    });
    expect(invitationRefusalMessage(error, "resend")).toBe(
      "Has alcanzado el límite de reenvíos para este miembro. Podrás volver a reenviar la invitación dentro de 25 minutos.",
    );
  });

  it.each([
    ["invite", "MEMBERSHIP_ALREADY_INVITED", "Este miembro ya tenía una invitación enviada."],
    ["resend", "MEMBERSHIP_NOT_INVITED", "Este miembro todavía no tiene ninguna invitación que reenviar."],
    ["invite", "MEMBERSHIP_ALREADY_EXISTS", "Este miembro ya ha aceptado la invitación."],
    ["revoke", "MEMBERSHIP_ALREADY_EXISTS", "Este miembro ya ha aceptado la invitación."],
  ] as const)("UI-MBR-014 %s refused with %s says why and that the list was refreshed", (write, code, message) => {
    expect(invitationRefusalMessage(apiError(409, { code }), write)).toBe(`${message} ${REFRESHED}`);
  });

  it("falls back to a sentence per write for a refusal it does not word", () => {
    expect(invitationRefusalMessage(apiError(500), "revoke")).toBe(
      "No se ha podido revocar el enlace. Inténtalo de nuevo.",
    );
  });
});

describe("invitationRefusalMessage for a community admin (#276)", () => {
  it("UI-ADM-006 says who can add a missing contact email, rather than pointing to a record edit", () => {
    expect(
      invitationRefusalMessage(apiError(400, { code: "MEMBERSHIP_WITHOUT_CONTACT_EMAIL" }), "resend", "admin"),
    ).toBe("Esta persona no tiene email de contacto. Un administrador de la comunidad puede añadirlo desde su ficha.");
  });

  it("UI-ADM-006 names the invitee in the resend limit", () => {
    const error = apiError(429, { code: "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED" }, { "retry-after": "7200" });
    expect(invitationRefusalMessage(error, "resend", "admin")).toBe(
      "Has alcanzado el límite de reenvíos para esta persona. Podrás volver a reenviar la invitación dentro de 2 horas.",
    );
  });

  it.each([
    ["resend", "MEMBERSHIP_NOT_INVITED", "Esta persona todavía no tiene ninguna invitación que reenviar."],
    ["resend", "MEMBERSHIP_DISABLED", "Esta persona está suspendida, así que no se le puede invitar."],
    ["resend", "MEMBERSHIP_ALREADY_EXISTS", "Esta persona ya ha aceptado la invitación."],
    ["revoke", "MEMBERSHIP_ALREADY_EXISTS", "Esta persona ya ha aceptado la invitación."],
  ] as const)("UI-ADM-006 %s refused with %s names the invitee and says the list was refreshed", (write, code, message) => {
    expect(invitationRefusalMessage(apiError(409, { code }), write, "admin")).toBe(`${message} ${REFRESHED}`);
  });

  it("UI-ADM-006 words a refusal that names nobody as the members page does", () => {
    expect(
      invitationRefusalMessage(apiError(503, { code: "MEMBERSHIP_INVITATION_UNAVAILABLE" }), "resend", "admin"),
    ).toBe("Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde.");
  });
});

describe("resendLimitMessage", () => {
  it.each([
    [60, "1 minuto"],
    [61, "2 minutos"],
    [3599, "60 minutos"],
    [3600, "1 hora"],
    [3601, "2 horas"],
    [86400, "24 horas"],
  ])("rounds %i s up to %s", (seconds, wait) => {
    expect(resendLimitMessage(seconds)).toContain(`dentro de ${wait}.`);
  });

  it("asks to try later when the backend gave no wait", () => {
    expect(resendLimitMessage(null)).toBe(
      "Has alcanzado el límite de reenvíos para este miembro. Vuelve a intentarlo más tarde.",
    );
  });
});

describe("removalRefusalMessage", () => {
  it("UI-MBR-015 gives the reason a supply owner cannot be removed, recommending suspension", () => {
    expect(removalRefusalMessage(apiError(409, { code: "MEMBERSHIP_OWNS_SUPPLIES" }))).toBe(
      "Este miembro es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
    );
  });

  it("keeps the generic sentence for any other refusal", () => {
    expect(removalRefusalMessage(apiError(500))).toBe("Error al eliminar el miembro. Por favor, inténtalo de nuevo.");
  });
});

describe("the last active admin (#309)", () => {
  const REASON = "Es el último administrador activo de la comunidad. Primero haz administrador a otro miembro activo.";
  const ADMIN_OWNS_SUPPLIES =
    "Este administrador es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, primero cámbiale el rol a miembro y después suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.";

  it("UI-MBR-028 counts the refusal as a stale row for the role change and the removal", () => {
    expect(STALE_ROW_CODES.changeRole).toContain("MEMBERSHIP_LAST_ACTIVE_ADMIN");
    expect(STALE_ROW_CODES.remove).toContain("MEMBERSHIP_LAST_ACTIVE_ADMIN");
  });

  it("UI-MBR-028 words a refused role change with the reason, and says the list was refreshed", () => {
    expect(roleChangeRefusalMessage(apiError(409, { code: "MEMBERSHIP_LAST_ACTIVE_ADMIN" }))).toBe(
      `${REASON} ${REFRESHED}`,
    );
  });

  it("keeps the generic wording for any other role change refusal", () => {
    expect(roleChangeRefusalMessage(apiError(500))).toBe("Error al actualizar el rol. Por favor, inténtalo de nuevo.");
  });

  it.each(["member", "admin"] as const)(
    "UI-MBR-028 words a refused removal with the reason, and says the list was refreshed, whatever the role (%s)",
    (subject) => {
      expect(removalRefusalMessage(apiError(409, { code: "MEMBERSHIP_LAST_ACTIVE_ADMIN" }), subject)).toBe(
        `${REASON} ${REFRESHED}`,
      );
    },
  );

  it("UI-MBR-029 recommends demoting an admin who owns supplies before suspending them", () => {
    expect(removalRefusalMessage(apiError(409, { code: "MEMBERSHIP_OWNS_SUPPLIES" }), "admin")).toBe(
      ADMIN_OWNS_SUPPLIES,
    );
  });

  it("UI-MBR-015 keeps the supplies wording for a member", () => {
    expect(removalRefusalMessage(apiError(409, { code: "MEMBERSHIP_OWNS_SUPPLIES" }), "member")).toBe(
      "Este miembro es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
    );
  });
});
