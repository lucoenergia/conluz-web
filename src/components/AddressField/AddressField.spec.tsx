import "@testing-library/jest-dom";
import { useState, type FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ADDRESS_MAX_LENGTH, AddressField } from "./AddressField";

/** The address input inside a form, as every record form holds it. */
function Harness({ onSubmit, initial = "" }: { onSubmit: (event: FormEvent) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event);
      }}
    >
      <AddressField label="Dirección" value={value} onValueChange={setValue} />
      <button type="submit">Guardar</button>
    </form>
  );
}

const address = () => screen.getByRole("textbox", { name: "Dirección" }) as HTMLTextAreaElement;

describe("UI-FRM-001 an address takes up to 250 characters", () => {
  it("UI-FRM-001 the limit is 250", () => {
    expect(ADDRESS_MAX_LENGTH).toBe(250);
  });

  it("UI-FRM-001 typing 251 characters leaves 250", async () => {
    const u = userEvent.setup();
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    await u.type(address(), "a".repeat(251));

    expect(address().value).toBe("a".repeat(250));
  });

  it("UI-FRM-001 keeps the caller's input attributes next to the limit", () => {
    renderWithProviders(
      <AddressField
        label="Dirección"
        value=""
        onValueChange={vi.fn()}
        readOnly
        slotProps={{ htmlInput: { autoComplete: "street-address" } }}
      />,
    );

    expect(address()).toHaveAttribute("maxlength", "250");
    expect(address()).toHaveAttribute("autocomplete", "street-address");
    expect(address()).toHaveAttribute("readonly");
  });
});

describe("UI-FRM-002 an address grows to show its value and stays one line", () => {
  it("UI-FRM-002 renders a textarea", () => {
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    expect(address().tagName).toBe("TEXTAREA");
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Shift+Enter", "{Shift>}{Enter}{/Shift}"],
  ])("UI-FRM-002 %s inserts no line break and submits the form once", async (_key, keys) => {
    const u = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} initial="Calle Mayor 1" />);

    await u.click(address());
    await u.keyboard(keys);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(address().value).toBe("Calle Mayor 1");
  });

  it("UI-FRM-002 pasted line breaks each become one space", async () => {
    const u = userEvent.setup();
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    await u.click(address());
    await u.paste("A\nB\r\nC");

    expect(address().value).toBe("A B C");
  });

  it("UI-FRM-002 a line break that arrives as a whole new value becomes a space", () => {
    renderWithProviders(<Harness onSubmit={vi.fn()} />);

    // Autofill and drop replace the value in one go, without keystrokes.
    fireEvent.change(address(), { target: { value: "Calle Mayor 1\rLuco\n\nde Jiloca" } });

    expect(address().value).toBe("Calle Mayor 1 Luco  de Jiloca");
  });

  it("UI-FRM-002 Enter that confirms a composition does not submit", () => {
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    fireEvent.keyDown(address(), { key: "Enter", isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
