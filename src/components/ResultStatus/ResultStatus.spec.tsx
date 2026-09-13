import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultStatus } from "./ResultStatus";

const NOUN = { one: "comunidad", other: "comunidades" };

describe("ResultStatus", () => {
  it("is a polite live region so a finished load does not interrupt", () => {
    render(<ResultStatus count={3} noun={NOUN} emptyMessage="Sin comunidades" />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("uses the singular form for exactly one result", () => {
    // Spanish plurals are not suffix-derivable — "1 comunidades" is the bug
    // this guards against.
    render(<ResultStatus count={1} noun={NOUN} emptyMessage="Sin comunidades" />);

    expect(screen.getByRole("status")).toHaveTextContent("1 comunidad");
    expect(screen.getByRole("status")).not.toHaveTextContent("comunidades");
  });

  it("uses the plural form for several results", () => {
    render(<ResultStatus count={4} noun={NOUN} emptyMessage="Sin comunidades" />);

    expect(screen.getByRole("status")).toHaveTextContent("4 comunidades");
  });

  it("announces the empty message rather than '0'", () => {
    render(<ResultStatus count={0} noun={NOUN} emptyMessage="No se encontraron comunidades" />);

    expect(screen.getByRole("status")).toHaveTextContent("No se encontraron comunidades");
  });

  it("announces loading while in flight, not the previous count", () => {
    render(<ResultStatus isLoading count={0} noun={NOUN} emptyMessage="No se encontraron comunidades" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(screen.getByRole("status")).not.toHaveTextContent("No se encontraron");
  });

  it("stays mounted across states so the region is not inserted with its content", () => {
    const { rerender } = render(
      <ResultStatus isLoading count={0} noun={NOUN} emptyMessage="Sin comunidades" />,
    );
    const first = screen.getByRole("status");

    rerender(<ResultStatus count={2} noun={NOUN} emptyMessage="Sin comunidades" />);

    expect(screen.getByRole("status")).toBe(first);
    expect(first).toHaveTextContent("2 comunidades");
  });
});
