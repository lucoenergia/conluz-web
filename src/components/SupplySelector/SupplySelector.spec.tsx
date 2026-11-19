import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { stubViewport } from "../../test/overlay";
import { buildSupply } from "../../test/fixtures";
import { SupplySelector } from "./SupplySelector";

const HOME = buildSupply({ id: "home", name: "Casa", code: "ES0021000000000001AA" });
const GARAGE = buildSupply({ id: "garage", name: "Garaje", code: "ES0021000000000002AA" });
const ALL = "Todos mis puntos";

function renderSelector(showAll?: boolean) {
  renderWithProviders(
    <SupplySelector supplies={[HOME, GARAGE]} selected={HOME} onSelect={() => {}} {...(showAll === undefined ? {} : { showAll })} />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SupplySelector's all-supplies option (#432)", () => {
  describe("from sm up, a dropdown", () => {
    const optionLabels = async () => {
      await userEvent.click(screen.getByRole("combobox", { name: "Punto de suministro" }));
      return within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent);
    };

    it("offers Todos mis puntos by default", async () => {
      stubViewport(1024);
      renderSelector();

      expect(await optionLabels()).toEqual([ALL, "Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
    });

    it("leaves it out with showAll={false}, and nothing else", async () => {
      stubViewport(1024);
      renderSelector(false);

      expect(await optionLabels()).toEqual(["Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
      expect(screen.getByText("Solo aparecen tus puntos activos en esta comunidad.")).toBeInTheDocument();
    });
  });

  describe("below sm, a bottom sheet", () => {
    const optionLabels = async () => {
      await userEvent.click(screen.getByRole("button", { name: /^Punto de suministro/ }));
      const sheet = screen.getByRole("dialog", { name: "Punto de suministro" });
      return within(sheet).getAllByRole("radio").map((radio) => radio.closest("label")!.textContent);
    };

    it("offers Todos mis puntos by default", async () => {
      stubViewport(390);
      renderSelector();

      expect(await optionLabels()).toEqual([ALL, "Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
    });

    it("leaves it out with showAll={false}, and nothing else", async () => {
      stubViewport(390);
      renderSelector(false);

      expect(await optionLabels()).toEqual(["Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
      expect(screen.getByText("Solo aparecen tus puntos activos en esta comunidad.")).toBeInTheDocument();
    });
  });
});
