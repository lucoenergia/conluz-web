import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SharingAgreementCard } from "./SharingAgreementCard";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard(
  agreement: SharingAgreementResponse,
  handlers: { onDeleteRequest?: (a: SharingAgreementResponse) => void } = {},
) {
  return render(
    <MemoryRouter>
      <SharingAgreementCard plantId="plant-1" agreement={agreement} {...handlers} />
    </MemoryRouter>,
  );
}

function getKebabButton() {
  return screen.getAllByRole("button").filter((button) => button.textContent === "")[0];
}

describe("SharingAgreementCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test("renders name, status label and installed power for a fully-populated agreement", () => {
    renderCard({
      id: "agreement-1",
      name: "Reparto vecinos bloque A",
      status: SharingAgreementResponseStatus.PUBLISHED,
      installedPowerKw: 42.5,
      createdAt: "2026-01-15T10:00:00Z",
      notes: "Acuerdo firmado en la reunión de la comunidad",
    });

    expect(screen.getByText("Reparto vecinos bloque A")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("42,50 kW")).toBeInTheDocument();
    expect(screen.getByText("Acuerdo firmado en la reunión de la comunidad")).toBeInTheDocument();
  });

  test("renders the title as a link to the detail page when the agreement has an id", () => {
    renderCard({ id: "agreement-2", name: "Con enlace" });

    const link = screen.getByRole("link", { name: "Con enlace" });
    expect(link).toHaveAttribute("href", "/production/plant-1/sharing-agreements/agreement-2");
  });

  test("clicking the card body navigates to the detail page", async () => {
    const user = userEvent.setup();
    const { container } = renderCard({ id: "agreement-2", name: "Con enlace" });

    await user.click(container.querySelector(".MuiCardContent-root") as HTMLElement);

    expect(mockNavigate).toHaveBeenCalledWith("/production/plant-1/sharing-agreements/agreement-2");
  });

  test("does not navigate when the click follows a text selection", async () => {
    const getSelectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "some selected notes",
    } as Selection);
    const user = userEvent.setup();
    const { container } = renderCard({ id: "agreement-2", name: "Con enlace" });

    await user.click(container.querySelector(".MuiCardContent-root") as HTMLElement);

    expect(mockNavigate).not.toHaveBeenCalled();
    getSelectionSpy.mockRestore();
  });

  test("clicking the kebab button opens the menu instead of navigating", async () => {
    const user = userEvent.setup();
    renderCard({ id: "agreement-3", name: "Borrador", status: SharingAgreementResponseStatus.DRAFT });

    await user.click(getKebabButton());

    await waitFor(() => expect(screen.getByText("Eliminar")).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("renders no kebab menu, no title link and no chevron when id is missing, without crashing", async () => {
    const user = userEvent.setup();
    const { container } = renderCard({ name: "Sin id" });

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Sin id" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("ChevronRightIcon")).not.toBeInTheDocument();

    await user.click(container.querySelector(".MuiCardContent-root") as HTMLElement);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("falls back visibly for every missing optional field", () => {
    renderCard({});

    expect(screen.getByText("Sin nombre")).toBeInTheDocument();
    expect(screen.getByText("Desconocido")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  test("shows Eliminar for a DRAFT agreement and wires it to onDeleteRequest", async () => {
    const onDeleteRequest = vi.fn();
    const user = userEvent.setup();
    const agreement = { id: "agreement-3", name: "Borrador", status: SharingAgreementResponseStatus.DRAFT };
    renderCard(agreement, { onDeleteRequest });

    await user.click(getKebabButton());
    await waitFor(() => expect(screen.getByText("Eliminar")).toBeInTheDocument());
    await user.click(screen.getByText("Eliminar"));

    expect(onDeleteRequest).toHaveBeenCalledWith(agreement);
  });

  test("renders no kebab at all for a non-DRAFT agreement, while keeping the card navigable", () => {
    renderCard({ id: "agreement-4", name: "Vigente", status: SharingAgreementResponseStatus.PUBLISHED });

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Vigente" })).toBeInTheDocument();
    expect(screen.getByTestId("ChevronRightIcon")).toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  test("truncates long notes with an ellipsis", () => {
    const longNotes = "a".repeat(200);
    renderCard({ name: "Con notas largas", notes: longNotes });

    const rendered = screen.getByText(/a{100,}…/);
    expect(rendered.textContent?.endsWith("…")).toBe(true);
    expect(rendered.textContent?.length).toBeLessThan(longNotes.length);
  });
});
