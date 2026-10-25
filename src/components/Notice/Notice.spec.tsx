import "@testing-library/jest-dom";
import { Alert } from "@mui/material";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { Notice } from "./Notice";

describe("Notice", () => {
  it("#310 AC1 is a note, never announced, when it is guidance that is part of the view", () => {
    renderWithProviders(<Notice severity="info">Registrarle no le envía nada.</Notice>);

    expect(screen.getByRole("note")).toHaveTextContent("Registrarle no le envía nada.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("#310 AC1 is a polite status when it reports the result of an action", () => {
    renderWithProviders(
      <Notice severity="success" announce>
        Contraseña cambiada.
      </Notice>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Contraseña cambiada.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("#310 AC1 keeps the severity's look: a warning note is still a warning", () => {
    renderWithProviders(<Notice severity="warning">No se volverá a mostrar.</Notice>);

    expect(screen.getByRole("note")).toHaveClass("MuiAlert-standardWarning");
  });

  it("#310 AC1 leaves a real error an alert", () => {
    renderWithProviders(<Alert severity="error">No se ha podido guardar.</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido guardar.");
  });
});
