import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SharingAgreementCard } from "./SharingAgreementCard";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

function renderCard(
  agreement: SharingAgreementResponse,
  handlers: { onEdit?: (a: SharingAgreementResponse) => void; onDeleteRequest?: (a: SharingAgreementResponse) => void } = {},
) {
  render(
    <MemoryRouter>
      <SharingAgreementCard plantId="plant-1" agreement={agreement} {...handlers} />
    </MemoryRouter>,
  );
}

function getKebabButton() {
  return screen.getAllByRole("button").filter((button) => button.textContent === "")[0];
}

describe("SharingAgreementCard", () => {
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

  test("renders a detail link, reachable from the kebab menu, only when the agreement has an id", async () => {
    const user = userEvent.setup();
    renderCard({ id: "agreement-2", name: "Con enlace" });

    await user.click(getKebabButton());

    await waitFor(() => expect(screen.getByText("Ver detalle")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: "Ver detalle" });
    expect(link).toHaveAttribute("href", "/production/plant-1/sharing-agreements/agreement-2");
  });

  test("renders no kebab menu when id is missing, without crashing", () => {
    renderCard({ name: "Sin id" });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByText("Ver detalle")).not.toBeInTheDocument();
  });

  test("falls back visibly for every missing optional field", () => {
    renderCard({});

    expect(screen.getByText("Sin nombre")).toBeInTheDocument();
    expect(screen.getByText("Desconocido")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  test("shows Editar/Eliminar for a DRAFT agreement and wires them to the callbacks", async () => {
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();
    const user = userEvent.setup();
    const agreement = { id: "agreement-3", name: "Borrador", status: SharingAgreementResponseStatus.DRAFT };
    renderCard(agreement, { onEdit, onDeleteRequest });

    await user.click(getKebabButton());
    await waitFor(() => expect(screen.getByText("Editar")).toBeInTheDocument());

    await user.click(screen.getByText("Editar"));
    expect(onEdit).toHaveBeenCalledWith(agreement);

    await user.click(getKebabButton());
    await waitFor(() => expect(screen.getByText("Eliminar")).toBeInTheDocument());
    await user.click(screen.getByText("Eliminar"));
    expect(onDeleteRequest).toHaveBeenCalledWith(agreement);
  });

  test("hides Editar/Eliminar for a non-DRAFT agreement", async () => {
    const user = userEvent.setup();
    renderCard({ id: "agreement-4", name: "Vigente", status: SharingAgreementResponseStatus.PUBLISHED });

    await user.click(getKebabButton());
    await waitFor(() => expect(screen.getByText("Ver detalle")).toBeInTheDocument());

    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
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
