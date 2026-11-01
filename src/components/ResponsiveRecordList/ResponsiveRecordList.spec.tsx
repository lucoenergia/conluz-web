import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ResponsiveRecordList } from "./ResponsiveRecordList";

const originalWidth = window.innerWidth;
const setViewportWidth = (width: number) =>
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });

afterEach(() => setViewportWidth(originalWidth));

const NARROW = <p>Lista apilada</p>;
const WIDE = <p>Tabla</p>;

describe("ResponsiveRecordList", () => {
  it("UI-LST-001 renders only the narrow layout below 1024px", () => {
    setViewportWidth(1023);
    renderWithProviders(<ResponsiveRecordList narrow={NARROW} wide={WIDE} />);

    expect(screen.getByText("Lista apilada")).toBeInTheDocument();
    expect(screen.queryByText("Tabla")).not.toBeInTheDocument();
  });

  it("UI-LST-001 renders only the wide layout from 1024px", () => {
    setViewportWidth(1024);
    renderWithProviders(<ResponsiveRecordList narrow={NARROW} wide={WIDE} />);

    expect(screen.getByText("Tabla")).toBeInTheDocument();
    expect(screen.queryByText("Lista apilada")).not.toBeInTheDocument();
  });

  it("renders the header above the rows and the footer below them", () => {
    renderWithProviders(
      <ResponsiveRecordList narrow={NARROW} wide={WIDE} header={<p>Cabecera</p>} footer={<p>Pie</p>} />,
    );

    expect(screen.getByText("Cabecera").compareDocumentPosition(screen.getByText("Tabla"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText("Tabla").compareDocumentPosition(screen.getByText("Pie"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows the empty state instead of either layout, keeping the header", () => {
    renderWithProviders(
      <ResponsiveRecordList narrow={NARROW} wide={WIDE} header={<p>Cabecera</p>} empty={<p>No hay nada</p>} />,
    );

    expect(screen.getByText("No hay nada")).toBeInTheDocument();
    expect(screen.getByText("Cabecera")).toBeInTheDocument();
    expect(screen.queryByText("Tabla")).not.toBeInTheDocument();
    expect(screen.queryByText("Lista apilada")).not.toBeInTheDocument();
  });

  it("UI-LST-004 shows what failed with a retry, and not the empty state, when the read fails", () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <ResponsiveRecordList
        narrow={NARROW}
        wide={WIDE}
        header={<p>Cabecera</p>}
        footer={<p>Pie</p>}
        empty={<p>No hay nada</p>}
        error={{ message: "No se pudieron cargar los miembros.", onRetry }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los miembros.");
    expect(screen.queryByText("No hay nada")).not.toBeInTheDocument();
    expect(screen.queryByText("Tabla")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
