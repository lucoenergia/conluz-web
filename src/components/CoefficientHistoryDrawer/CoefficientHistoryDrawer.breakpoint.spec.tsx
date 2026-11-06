import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { stubViewport } from "../../test/overlay";
import { useGetPartitionCoefficientHistory, type getPartitionCoefficientHistory } from "../../api/supplies/supplies";
import { CoefficientHistoryDrawer } from "./CoefficientHistoryDrawer";

vi.mock(import("../../api/supplies/supplies"), () => ({
  useGetPartitionCoefficientHistory: vi.fn(),
}));

const SUPPLY = { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AB" };

beforeEach(() => {
  vi.mocked(useGetPartitionCoefficientHistory).mockReturnValue(query.success<typeof getPartitionCoefficientHistory>([]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const panel = () => screen.getByLabelText("Histórico de coeficientes de Vivienda A");

describe("UI-AGR-017 the coefficient history: a side drawer from md up, a bottom sheet below", () => {
  it.each([
    [899, "MuiDrawer-paperAnchorBottom"],
    [900, "MuiDrawer-paperAnchorRight"],
  ] as const)("UI-AGR-017 at %s px it is anchored with %s", (width, anchor) => {
    stubViewport(width);
    renderWithProviders(<CoefficientHistoryDrawer isOpen onClose={vi.fn()} supply={SUPPLY} plantId="plant-norte" />);

    expect(panel()).toHaveClass(anchor);
  });
});
