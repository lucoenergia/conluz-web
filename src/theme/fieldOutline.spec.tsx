import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { TextField, outlinedInputClasses } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { pickersOutlinedInputClasses } from "@mui/x-date-pickers/PickersTextField";
import { renderWithProviders } from "../test/renderWithProviders";
import { cascadedValue } from "../test/cascade";
import { theme } from "./index";
import { fieldOutline, outlinedFieldStyles } from "./fieldOutline";
import { colors } from "./tokens";

/** Luminance contrast between two #rrggbb colours (WCAG 2). */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
    const linear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(blue);
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The shared styles with the class names taken out: what a state looks like, whatever the component. */
const shape = (classes: Parameters<typeof outlinedFieldStyles>[0]) =>
  JSON.parse(
    JSON.stringify(outlinedFieldStyles(classes))
      .replaceAll(classes.notchedOutline, "OUTLINE")
      .replaceAll(classes.focused, "FOCUSED")
      .replaceAll(classes.error, "ERROR")
      .replaceAll(classes.disabled, "DISABLED"),
  );

describe("the shared field outline", () => {
  it("UI-FRM-004 draws the enabled outline at 3:1 or more against the field's fill and the page background", () => {
    expect(fieldOutline.color).toBe(colors.text.placeholder);
    expect(fieldOutline.fill).toBe(colors.background.paper);
    expect(contrast(fieldOutline.color, fieldOutline.fill)).toBeGreaterThanOrEqual(3);
    expect(contrast(fieldOutline.color, colors.background.default)).toBeGreaterThanOrEqual(3);
  });

  it("UI-FRM-004 sets the enabled outline and fill, hover, focus and error, and leaves the disabled look to MUI", () => {
    const classes = { notchedOutline: "OUTLINE", focused: "FOCUSED", error: "ERROR", disabled: "DISABLED" };

    expect(outlinedFieldStyles(classes)).toEqual({
      "&:not(.DISABLED)": {
        backgroundColor: colors.background.paper,
        "& .OUTLINE": { borderColor: colors.text.placeholder },
        "&:hover:not(.FOCUSED):not(.ERROR) .OUTLINE": { borderColor: colors.text.primary },
        "&.FOCUSED .OUTLINE": { borderColor: theme.palette.primary.main, borderWidth: 2 },
        "&.ERROR .OUTLINE": { borderColor: theme.palette.error.main },
      },
    });
  });

  it("UI-FRM-004 gives text fields and date fields the very same values, through the theme", () => {
    const overrides = theme.components;

    expect(overrides?.MuiOutlinedInput?.styleOverrides?.root).toEqual(outlinedFieldStyles(outlinedInputClasses));
    expect(overrides?.MuiPickersOutlinedInput?.styleOverrides?.root).toEqual(outlinedFieldStyles(pickersOutlinedInputClasses));
    expect(shape(pickersOutlinedInputClasses)).toEqual(shape(outlinedInputClasses));
  });
});

describe("a text field and a date field, rendered", () => {
  /** The outline element and the root of a field, found from its label: structural, as these are presentation only. */
  function parts(label: string) {
    const control = screen.getByText(label, { selector: "label" }).closest(".MuiFormControl-root, .MuiPickersTextField-root")!;
    const outline = control.querySelector("fieldset")!;
    return { outline, root: outline.parentElement! };
  }

  function renderFields(state: { disabled?: boolean; error?: boolean; focused?: boolean } = {}) {
    renderWithProviders(
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <TextField label="Texto" size="small" {...state} />
        <DesktopDatePicker label="Fecha" disabled={state.disabled} slotProps={{ textField: { size: "small", error: state.error, focused: state.focused } }} />
      </LocalizationProvider>,
    );
    return { text: parts("Texto"), date: parts("Fecha") };
  }

  it("UI-FRM-004 draws the same enabled outline and fill on both", () => {
    const { text, date } = renderFields();

    expect(cascadedValue(text.outline, "border-color")).toBe(fieldOutline.color);
    expect(cascadedValue(date.outline, "border-color")).toBe(fieldOutline.color);
    expect(cascadedValue(text.root, "background-color")).toBe(fieldOutline.fill);
    expect(cascadedValue(date.root, "background-color")).toBe(fieldOutline.fill);
  });

  it("UI-FRM-004 draws the same focused outline on both", () => {
    const { text, date } = renderFields({ focused: true });

    expect(cascadedValue(text.outline, "border-color")).toBe(fieldOutline.focusedColor);
    expect(cascadedValue(date.outline, "border-color")).toBe(fieldOutline.focusedColor);
  });

  it("UI-FRM-004 draws the same error outline on both", () => {
    const { text, date } = renderFields({ error: true });

    expect(cascadedValue(text.outline, "border-color")).toBe(fieldOutline.errorColor);
    expect(cascadedValue(date.outline, "border-color")).toBe(fieldOutline.errorColor);
  });

  it("UI-FRM-004 leaves both disabled fields with MUI's own look, alike", () => {
    const { text, date } = renderFields({ disabled: true });

    const textOutline = cascadedValue(text.outline, "border-color");
    expect(textOutline).toBeDefined();
    expect(textOutline).not.toBe(fieldOutline.color);
    expect(cascadedValue(date.outline, "border-color")).toBe(textOutline);
    expect(cascadedValue(text.root, "background-color")).toBe(cascadedValue(date.root, "background-color"));
    expect(cascadedValue(text.root, "background-color")).not.toBe(fieldOutline.fill);
  });
});
