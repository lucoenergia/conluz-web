import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { expectPasswordFieldContract } from "../../test/passwordField";
import { PasswordInput } from "./PasswordInput";

/** Controlled, as every screen uses it, so the test sees what the screen would store. */
const Controlled = ({ describedBy }: { describedBy?: string }) => {
  const [value, setValue] = useState("");
  return (
    <>
      <PasswordInput
        placeholder="Contraseña"
        autoComplete="current-password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        slotProps={describedBy ? { htmlInput: { "aria-describedby": describedBy } } : undefined}
      />
      <output aria-label="stored">{JSON.stringify(value)}</output>
    </>
  );
};

describe("PasswordInput", () => {
  it("renders a password field", () => {
    renderWithProviders(<PasswordInput placeholder="Contraseña" />);
    expect(screen.getByPlaceholderText("Contraseña")).toHaveAttribute("type", "password");
  });

  it("reveals and hides the value through a labelled toggle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PasswordInput placeholder="Contraseña" />);
    const input = screen.getByPlaceholderText("Contraseña");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("accepts a pasted value and keeps it exactly as pasted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled />);

    await user.click(screen.getByPlaceholderText("Contraseña"));
    await user.paste("  una frase pegada  ");

    expect(screen.getByPlaceholderText("Contraseña")).toHaveValue("  una frase pegada  ");
    // textContent, not toHaveTextContent: the matcher collapses whitespace.
    expect(screen.getByRole("status", { name: "stored" }).textContent).toBe('"  una frase pegada  "');
  });

  it("turns off autocorrect, autocapitalize and spellcheck, hidden and revealed", async () => {
    renderWithProviders(<Controlled />);
    await expectPasswordFieldContract(userEvent.setup(), screen.getByPlaceholderText("Contraseña"), "current-password");
  });

  it("keeps the caller's input attributes alongside its own", async () => {
    renderWithProviders(<Controlled describedBy="hint" />);
    const input = screen.getByPlaceholderText("Contraseña");

    expect(input).toHaveAttribute("aria-describedby", "hint");
    await expectPasswordFieldContract(userEvent.setup(), input, "current-password");
    expect(input).toHaveAttribute("aria-describedby", "hint");
  });
});
