import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ActionStatus } from "./ActionStatus";

describe("ActionStatus", () => {
  it("#310 holds back a message it mounts with: the region is in place empty, then takes the text", async () => {
    renderWithProviders(<ActionStatus message="Contraseña cambiada." />);

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/^$/);

    expect(await screen.findByText("Contraseña cambiada.")).toBe(region);
  });

  it("shows a message set after it mounted at once", () => {
    const { rerender } = renderWithProviders(<ActionStatus message="" />);
    const region = screen.getByRole("status");

    rerender(<ActionStatus message="Canal guardado." />);

    expect(region).toHaveTextContent("Canal guardado.");
    expect(screen.getByRole("status")).toBe(region);
  });

  it("is a polite live region", () => {
    renderWithProviders(<ActionStatus message="" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
