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
  const onSave = vi.fn();
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <IntegrationCard
        provider={PROVIDER}
        accent="#0078ac"
        value={{ enabled: true, username: "u", baseUrl: "https://datadis.es/api-private" }}
        onChange={onChange}
        onSave={onSave}
        isSaving={false}
        {...overrides}
      />
    </ThemeProvider>,
  );
  return { onSave, onChange };
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
    const { onSave } = setup({ isLoading: true });

    const save = screen.getByRole("button", { name: /Guardar/ });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("restores the toggle and enables saving once the configuration has arrived", () => {
    setup({ isLoading: false });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar/ })).toBeEnabled();
  });
});
