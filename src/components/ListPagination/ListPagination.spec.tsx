import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ListPagination } from "./ListPagination";

const NOUN = { one: "miembro", other: "miembros" };
const originalWidth = window.innerWidth;
const setViewportWidth = (width: number) =>
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });

afterEach(() => setViewportWidth(originalWidth));

describe("ListPagination", () => {
  it("UI-LST-005 renders nothing for 25 rows", () => {
    const { container } = renderWithProviders(
      <ListPagination page={1} pageCount={1} total={25} noun={NOUN} onChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("UI-LST-005 shows the range of 25 rows for 26", () => {
    renderWithProviders(<ListPagination page={1} pageCount={2} total={26} noun={NOUN} onChange={vi.fn()} />);

    expect(screen.getByText("1–25 de 26 miembros")).toBeInTheDocument();
  });

  it("captions a middle page with its own range", () => {
    renderWithProviders(<ListPagination page={2} pageCount={6} total={128} noun={NOUN} onChange={vi.fn()} />);

    expect(screen.getByText("26–50 de 128 miembros")).toBeInTheDocument();
  });

  it("UI-LST-005 offers previous, the page of the total and next below 1024px", () => {
    setViewportWidth(1023);
    const onChange = vi.fn();
    renderWithProviders(<ListPagination page={1} pageCount={2} total={26} noun={NOUN} onChange={onChange} />);

    const nav = screen.getByRole("navigation", { name: "Páginas de miembros" });
    expect(nav).toHaveTextContent("1 de 2");
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("UI-LST-005 offers the page numbers, named in Spanish, from 1024px", () => {
    setViewportWidth(1024);
    const onChange = vi.fn();
    renderWithProviders(<ListPagination page={1} pageCount={2} total={26} noun={NOUN} onChange={onChange} />);

    expect(screen.getByRole("navigation", { name: "Páginas de miembros" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 1, la actual" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Última página" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
