import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@mui/material/styles";
import { IntegrationCard } from "./IntegrationCard";
import { theme } from "../../theme";

const PROVIDER = {
  id: "datadis",
  name: "Datadis",
  icon: "electric_meter",
  color: "#0078ac",
  description: "Plataforma oficial de las distribuidoras eléctricas.",
  fields: ["credentials"],
  urlPlaceholder: "https://datadis.es/api-private",
};

const setup = (overrides: Partial<React.ComponentProps<typeof IntegrationCard>> = {}) => {
  const run = vi.fn().mockResolvedValue(undefined);
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <IntegrationCard
        provider={PROVIDER}
        accent="#0078ac"
        value={{ enabled: true, username: "u", baseUrl: "https://datadis.es/api-private" }}
        onChange={onChange}
        save={{ run, isPending: false }}
        {...overrides}
      />
    </ThemeProvider>,
  );
  return { run, onChange };
};

describe("IntegrationCard loading state", () => {
  it("announces that this provider's configuration is still loading", () => {
    setup({ isLoading: true });

    expect(screen.getByRole("progressbar", { name: "Cargando configuración de Datadis" })).toBeInTheDocument();
  });

  it("hides the toggle while loading, so a choice cannot be silently overwritten", () => {
    // The page prefills state from the response when it lands. A toggle made
    // before that would be clobbered without the user ever being told.
    setup({ isLoading: true });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("cannot be saved while its stored configuration is still in flight", () => {
    // Guards real data loss: saving here would PUT empty credentials over the
    // stored ones. fireEvent rather than userEvent because the latter refuses
    // to click a disabled control — the guarantee under test is that the
    // handler stays unreachable even so.
    const { run } = setup({ isLoading: true });

    const save = screen.getByRole("button", { name: /Guardar/ });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(run).not.toHaveBeenCalled();
  });

  it("shows the action's own pending flag, so there is no second source of truth", () => {
    // isPending lives inside the action rather than beside it: a card cannot be
    // left spinning for a mutation that has already settled.
    // The mock is created here, not taken from setup(): setup's own is replaced
    // by this override, so asserting on it would assert on something the card
    // never received and could not fail.
    const run = vi.fn();
    setup({ save: { run, isPending: true } });

    const save = screen.getByRole("button", { name: /Guardando/ });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(run).not.toHaveBeenCalled();
  });

  it("restores the toggle and enables saving once the configuration has arrived", () => {
    setup({ isLoading: false });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar/ })).toBeEnabled();
  });
});
