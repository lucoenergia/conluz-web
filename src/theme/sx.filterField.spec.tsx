import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Button, MenuItem, TextField } from "@mui/material";
import { renderWithProviders } from "../test/renderWithProviders";
import { cascadedValue } from "../test/cascade";
import { fieldOutline } from "./fieldOutline";
import { sxStyles } from "./sx";

describe("sxStyles.filterField", () => {
  it("UI-FRM-004 draws an outlined Button standing in for a field with the shared outline and fill", () => {
    renderWithProviders(
      <Button variant="outlined" color="inherit" sx={sxStyles.filterField}>
        Casa
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Casa" });

    expect(cascadedValue(button, "border-color")).toBe(fieldOutline.color);
    expect(cascadedValue(button, "background-color")).toBe(fieldOutline.fill);
    expect(cascadedValue(button, "min-height")).toBe("64px");
  });

  it("UI-FRM-004 sizes a select field the same, at 64 px, its value centred", () => {
    renderWithProviders(
      <TextField select label="Periodo" value="month" sx={sxStyles.filterField}>
        <MenuItem value="month">Último mes</MenuItem>
      </TextField>,
    );
    const select = screen.getByRole("combobox", { name: "Periodo" });

    expect(cascadedValue(select.closest(".MuiInputBase-root")!, "min-height")).toBe("64px");
    expect(cascadedValue(select, "align-items")).toBe("center");
  });
});
