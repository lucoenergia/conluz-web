import { expect } from "vitest";
import { within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/**
 * Asserts what every password field must offer (#196): a show/hide toggle, the
 * given `autocomplete`, and autocorrect, autocapitalize and spellcheck turned
 * off -- in the hidden state AND after revealing the value, when the input is
 * a plain text field that a mobile keyboard would otherwise edit. Leaves the
 * field hidden again.
 *
 * `input` is the field; its toggle is found inside the same MUI form control.
 */
export async function expectPasswordFieldContract(
  user: UserEvent,
  input: HTMLElement,
  autoComplete: "current-password" | "new-password",
): Promise<void> {
  const control = input.closest(".MuiFormControl-root");
  if (!(control instanceof HTMLElement)) throw new Error("password input is not inside a MUI form control");
  const field = within(control);

  const expectAttributes = (type: "password" | "text") => {
    expect(input).toHaveAttribute("type", type);
    expect(input).toHaveAttribute("autocomplete", autoComplete);
    expect(input).toHaveAttribute("autocorrect", "off");
    expect(input).toHaveAttribute("autocapitalize", "none");
    expect(input).toHaveAttribute("spellcheck", "false");
  };

  expectAttributes("password");
  await user.click(field.getByRole("button", { name: "Mostrar contraseña" }));
  expectAttributes("text");
  await user.click(field.getByRole("button", { name: "Ocultar contraseña" }));
  expectAttributes("password");
}
