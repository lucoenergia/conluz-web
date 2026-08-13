import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SharingAgreementCard } from "./SharingAgreementCard";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

function renderCard(agreement: SharingAgreementResponse) {
  render(
    <MemoryRouter>
      <SharingAgreementCard plantId="plant-1" agreement={agreement} />
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
    expect(screen.getByText("42.5 kW")).toBeInTheDocument();
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

  test("truncates long notes with an ellipsis", () => {
    const longNotes = "a".repeat(200);
    renderCard({ name: "Con notas largas", notes: longNotes });

    const rendered = screen.getByText(/a{100,}…/);
    expect(rendered.textContent?.endsWith("…")).toBe(true);
    expect(rendered.textContent?.length).toBeLessThan(longNotes.length);
  });
});
