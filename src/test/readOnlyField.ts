import { expect } from "vitest";
import type { UserEvent } from "@testing-library/user-event";
import { colors } from "../theme/tokens";
import { declaredStyleWithin } from "./declaredStyle";

/**
 * The declarations written for the MUI form control around `input`. A
 * structural locator, because the presentation is CSS emotion writes inside
 * `@layer mui`, which jsdom does not cascade: `declaredStyleWithin` reads it
 * from the control's own rules instead.
 */
export function fieldStyles(input: HTMLElement): [selector: string, property: string, value: string][] {
  const control = input.closest(".MuiFormControl-root");
  if (!control) throw new Error("input is not inside a MUI form control");
  return declaredStyleWithin(control);
}

/** Whether the input is drawn with the read-only presentation's fill (UI-FRM-003). */
export function usesReadOnlyPresentation(input: HTMLElement): boolean {
  return fieldStyles(input).some(
    ([selector, property, value]) =>
      /\.MuiOutlinedInput-root$/.test(selector) && property === "background-color" && value === colors.background.readOnly,
  );
}

/** Presses Tab from the top of the document until `element` has focus, and fails if it never does. */
export async function tabTo(user: UserEvent, element: HTMLElement, maxPresses = 60): Promise<void> {
  (document.activeElement as HTMLElement | null)?.blur();
  for (let press = 0; press < maxPresses && document.activeElement !== element; press++) await user.tab();
  expect(element).toHaveFocus();
}

/**
 * What every field that is never editable from its screen must do
 * (UI-FRM-003): the shared presentation, never disabled, reached by Tab, and
 * its value unchanged by typing, deleting or pasting.
 */
export async function expectReadOnlyFieldContract(user: UserEvent, input: HTMLElement, value: string): Promise<void> {
  expect(usesReadOnlyPresentation(input)).toBe(true);
  expect(input).toHaveAttribute("readonly");
  expect(input).not.toBeDisabled();

  await tabTo(user, input);

  await user.type(input, "{Backspace}x");
  await user.paste("pegado");
  expect(input).toHaveValue(value);
}
