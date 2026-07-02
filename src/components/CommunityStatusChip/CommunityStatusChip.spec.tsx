import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CommunityStatusChip } from "./CommunityStatusChip";

describe("CommunityStatusChip", () => {
  it("renders the status label for each status", () => {
    const { rerender } = render(<CommunityStatusChip status="Activa" />);
    expect(screen.getByText("Activa")).toBeInTheDocument();

    rerender(<CommunityStatusChip status="Sin admin" />);
    expect(screen.getByText("Sin admin")).toBeInTheDocument();

    rerender(<CommunityStatusChip status="Sin usuarios" />);
    expect(screen.getByText("Sin usuarios")).toBeInTheDocument();

    rerender(<CommunityStatusChip status="Deshabilitada" />);
    expect(screen.getByText("Deshabilitada")).toBeInTheDocument();
  });

  it("renders Deshabilitada as an outlined chip (distinct from filled Sin usuarios)", () => {
    const { container } = render(<CommunityStatusChip status="Deshabilitada" />);
    expect(container.querySelector(".MuiChip-outlined")).toBeInTheDocument();
  });

  it("renders Sin usuarios as a non-outlined (filled) chip", () => {
    const { container } = render(<CommunityStatusChip status="Sin usuarios" />);
    expect(container.querySelector(".MuiChip-outlined")).not.toBeInTheDocument();
  });
});
