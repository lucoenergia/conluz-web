import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { SharingAgreementsPage } from "./SharingAgreementsPage";

function setup(plantId = "plant-1") {
  render(
    <MemoryRouter initialEntries={[`/production/${plantId}/sharing-agreements`]}>
      <Routes>
        <Route path="/production/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SharingAgreementsPage", () => {
  test("renders the page title", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Acuerdos de Reparto" })).toBeInTheDocument();
  });

  test("renders a breadcrumb linking back to the plant", () => {
    setup("plant-42");
    const planLink = screen.getByText("Planta").closest("a");
    expect(planLink).toHaveAttribute("href", "/production/plant-42");
  });
});
