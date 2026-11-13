import "@testing-library/jest-dom";
import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { SearchBar } from "./SearchBar";

const ControlledSearchBar = ({ onChange }: { onChange?: (value: string) => void }) => {
  const [value, setValue] = useState("");
  const handleChange = (next: string) => {
    onChange?.(next);
    setValue(next);
  };
  return <SearchBar value={value} onChange={handleChange} placeholder="Buscar punto de suministro..." />;
};

/** The CSS rules emotion injected for the native cancel button. jsdom renders no
 *  pseudo-element, so the rule itself is what the test can read. */
const nativeCancelButtonRules = () =>
  Array.from(document.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("")
    .match(/[^{}]*::-webkit-search-cancel-button\s*\{[^}]*\}/g) ?? [];

describe("SearchBar", () => {
  it("is a search box named after its placeholder", () => {
    renderWithProviders(<ControlledSearchBar />);

    expect(screen.getByRole("searchbox", { name: "Buscar punto de suministro..." })).toBeInTheDocument();
  });

  it("offers a single clear control once text is typed, and it clears the field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<ControlledSearchBar onChange={onChange} />);
    const input = screen.getByRole("searchbox");

    expect(screen.queryByRole("button", { name: "Borrar búsqueda" })).not.toBeInTheDocument();

    await user.type(input, "ES0031");

    expect(screen.getAllByRole("button")).toHaveLength(1);
    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Borrar búsqueda" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");

    expect(input).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Borrar búsqueda" })).not.toBeInTheDocument();
  });

  it("hides the browser's native cancel button, which would duplicate 'Borrar búsqueda'", () => {
    renderWithProviders(<ControlledSearchBar />);

    const rules = nativeCancelButtonRules();
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatch(/\.MuiInputBase-input::-webkit-search-cancel-button/);
    expect(rules[0]).toMatch(/display:\s*none/);
    expect(rules[0]).toMatch(/appearance:\s*none/);
  });
});
