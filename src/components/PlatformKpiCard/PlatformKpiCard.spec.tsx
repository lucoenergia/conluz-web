import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PlatformKpiCard } from "./PlatformKpiCard";

describe("PlatformKpiCard", () => {
  it("renders label, value and sublabel", () => {
    render(<PlatformKpiCard label="Comunidades" value={12} sublabel="10 con usuarios · 2 sin usuarios" />);
    expect(screen.getByText("Comunidades")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("10 con usuarios · 2 sin usuarios")).toBeInTheDocument();
  });

  it("renders a string value", () => {
    render(<PlatformKpiCard label="Usuarios" value="326" sublabel="personas distintas" />);
    expect(screen.getByText("326")).toBeInTheDocument();
  });
});
