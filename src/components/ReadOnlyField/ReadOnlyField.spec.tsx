import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "@mui/material";
import { renderWithProviders } from "../../test/renderWithProviders";
import { expectReadOnlyFieldContract, fieldStyles, tabTo, usesReadOnlyPresentation } from "../../test/readOnlyField";
import { colors } from "../../theme/tokens";
import { ReadOnlyField } from "./ReadOnlyField";

const HELPER = "Identifica su cuenta, así que no se cambia desde aquí.";

const Editable = () => {
  const [value, setValue] = useState("ana@example.com");
  return <TextField label="Email" value={value} onChange={(event) => setValue(event.target.value)} fullWidth />;
};

function renderForm() {
  renderWithProviders(
    <form>
      <ReadOnlyField label="DNI/NIE" value="12345678Z" helperText={HELPER} />
      <Editable />
    </form>,
  );
  return {
    readOnly: screen.getByRole("textbox", { name: "DNI/NIE" }),
    editable: screen.getByRole("textbox", { name: "Email" }),
  };
}

/** The value a property is declared with under a rule whose selector matches. */
const declared = (input: HTMLElement, selector: RegExp, property: string) =>
  fieldStyles(input)
    .filter(([rule, name]) => selector.test(rule) && name === property)
    .map(([, , value]) => value);

describe("UI-FRM-003 the read-only presentation", () => {
  it("UI-FRM-003 fills the field in grey and shows the value at full contrast", () => {
    const { readOnly } = renderForm();

    expect(declared(readOnly, /\.MuiFilledInput-root$/, "background-color")).toEqual([colors.background.readOnly]);
    expect(declared(readOnly, /\.MuiInputBase-input$/, "color")).toEqual([colors.text.primary]);
  });

  it("UI-FRM-003 keeps the resting fill on hover and focus, never the editable highlight", () => {
    const { readOnly } = renderForm();

    for (const state of [/\.MuiFilledInput-root:hover$/, /\.MuiFilledInput-root\.Mui-focused$/]) {
      expect(declared(readOnly, state, "background-color")).toEqual([colors.background.readOnly]);
    }
    expect(declared(readOnly, /\.MuiInputLabel-root\.Mui-focused$/, "color")).not.toContain(colors.brand.main);
  });

  it("UI-FRM-003 shows no text caret and the default cursor", () => {
    const { readOnly } = renderForm();

    expect(declared(readOnly, /\.MuiInputBase-input$/, "caret-color")).toEqual(["transparent"]);
    expect(declared(readOnly, /\.MuiInputBase-input$/, "cursor")).toEqual(["default"]);
  });

  it("UI-FRM-003 draws a focus indication inside the field, not the primary border", () => {
    const { readOnly } = renderForm();

    const focus = declared(readOnly, /\.MuiFilledInput-root\.Mui-focused$/, "box-shadow");
    expect(focus).toEqual([`inset 0 0 0 2px ${colors.secondary.main}`]);
    expect(fieldStyles(readOnly).filter(([, property]) => property === "outline-offset")).toEqual([]);
  });

  it("UI-FRM-003 is read-only, never disabled, and keeps its label and helper text", () => {
    const { readOnly } = renderForm();

    expect(readOnly).toHaveAttribute("readonly");
    expect(readOnly).not.toBeDisabled();
    expect(readOnly).toHaveValue("12345678Z");
    expect(readOnly).toHaveAccessibleDescription(HELPER);
  });

  it("UI-FRM-003 is reached by Tab, and typing, deleting or pasting changes nothing", async () => {
    const user = userEvent.setup();
    const { readOnly } = renderForm();

    await expectReadOnlyFieldContract(user, readOnly, "12345678Z");
  });

  it("UI-FRM-003 lets the value be selected", async () => {
    const user = userEvent.setup();
    const { readOnly } = renderForm();
    if (!(readOnly instanceof HTMLInputElement)) throw new Error("the field is not an input");

    await tabTo(user, readOnly);
    readOnly.select();

    expect(readOnly.value.slice(readOnly.selectionStart ?? 0, readOnly.selectionEnd ?? 0)).toBe("12345678Z");
    expect(fieldStyles(readOnly).filter(([, property]) => property === "user-select")).toEqual([]);
  });

  it("UI-FRM-003 leaves an editable input next to it as it was", async () => {
    const user = userEvent.setup();
    const { editable } = renderForm();

    expect(usesReadOnlyPresentation(editable)).toBe(false);
    expect(editable).not.toHaveAttribute("readonly");
    await user.type(editable, "x");
    expect(editable).toHaveValue("ana@example.comx");
  });
});
