import { describe, expect, it } from "vitest";
import { Box } from "@mui/material";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./renderWithProviders";
import { declaredStyle } from "./declaredStyle";

describe("declaredStyle", () => {
  it("reads what an sx object declared, though the harness layers MUI's rules where jsdom cannot cascade them", () => {
    renderWithProviders(
      <Box aria-label="probe" role="img" sx={{ bgcolor: "#00a975", border: "2px solid #286cdb", "&:hover": { bgcolor: "#000000" } }} />,
    );
    const probe = screen.getByRole("img", { name: "probe" });

    expect(getComputedStyle(probe).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(declaredStyle(probe)).toMatchObject({ "background-color": "#00a975", border: "2px solid #286cdb" });
  });

  it("reads nothing for an element without emotion classes", () => {
    renderWithProviders(<div role="img" aria-label="plain" />);

    expect(declaredStyle(screen.getByRole("img", { name: "plain" }))).toEqual({});
  });
});
