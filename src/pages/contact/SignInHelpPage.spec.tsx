import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGetOperatorContact, type getOperatorContact } from "../../api/info/info";
import { apiError } from "../../test/apiError";
import { buildOperatorContact } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { SignInHelpPage } from "./SignInHelpPage";

vi.mock(import("../../api/info/info"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetOperatorContact: vi.fn(),
}));

const OPERATOR = buildOperatorContact({
  name: "Plataforma Conluz",
  email: "ayuda@conluz.test",
  phone: "+34 600 555 666",
  schedule: "De 10:00 a 13:00",
  notes: "No gestionamos las comunidades: te diremos a quién dirigirte.",
});

const INSTRUCTION = "Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.";
const OPERATOR_HEADING = "¿No sabes quién gestiona tu comunidad?";

const follows = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  vi.mocked(useGetOperatorContact).mockReset();
});

describe("SignInHelpPage", () => {
  it("UI-CTU-005 shows the instruction, then password recovery, then the operator contact", () => {
    vi.mocked(useGetOperatorContact).mockReturnValue(query.success<typeof getOperatorContact>({ contact: OPERATOR }));
    renderWithProviders(<SignInHelpPage />, { route: "/contact" });

    const instruction = screen.getByText(INSTRUCTION);
    const recovery = screen.getByRole("link", { name: "«¿Olvidaste tu contraseña?»" });
    const operator = screen.getByRole("heading", { name: OPERATOR_HEADING });
    expect(follows(instruction, recovery)).toBe(true);
    expect(follows(recovery, operator)).toBe(true);

    expect(recovery).toHaveAttribute("href", "/forgot-password");
    expect(recovery.parentElement).toHaveTextContent("si tu cuenta tiene un email asociado.");
    expect(screen.getByText("Plataforma Conluz")).toBeVisible();
    expect(screen.getByRole("link", { name: "+34 600 555 666" })).toHaveAttribute("href", "tel:+34600555666");
    expect(screen.getByRole("link", { name: "ayuda@conluz.test" })).toHaveAttribute("href", "mailto:ayuda@conluz.test");
    expect(screen.getByText("De 10:00 a 13:00")).toBeVisible();
    expect(screen.getByText("No gestionamos las comunidades: te diremos a quién dirigirte.")).toBeVisible();
  });

  it("UI-CTU-005 with no operator configured, shows the instruction and the recovery link only", () => {
    vi.mocked(useGetOperatorContact).mockReturnValue(query.success<typeof getOperatorContact>({ contact: null }));
    renderWithProviders(<SignInHelpPage />, { route: "/contact" });

    expect(screen.getByText(INSTRUCTION)).toBeVisible();
    expect(screen.getByRole("link", { name: "«¿Olvidaste tu contraseña?»" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: OPERATOR_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-CTU-005 with a failed operator request, shows the instruction and the recovery link only, with no alert", () => {
    vi.mocked(useGetOperatorContact).mockReturnValue(query.error(apiError(503)));
    renderWithProviders(<SignInHelpPage />, { route: "/contact" });

    expect(screen.getByText(INSTRUCTION)).toBeVisible();
    expect(screen.getByRole("link", { name: "«¿Olvidaste tu contraseña?»" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: OPERATOR_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers a way back to sign in", () => {
    vi.mocked(useGetOperatorContact).mockReturnValue(query.success<typeof getOperatorContact>({ contact: null }));
    renderWithProviders(<SignInHelpPage />, { route: "/contact" });

    expect(screen.getByRole("link", { name: "Volver a iniciar sesión" })).toHaveAttribute("href", "/login");
  });
});
