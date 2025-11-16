import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { FilterChipsBar } from "./FilterChipsBar";

describe("FilterChipsBar", () => {
  it("renders all filter chips", () => {
    render(<FilterChipsBar value="all" onChange={() => {}} />);

    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Activos")).toBeInTheDocument();
    expect(screen.getByText("Inactivos")).toBeInTheDocument();
  });

  it("calls onChange with 'all' when Todos chip is clicked", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterChipsBar value="active" onChange={handleChange} />);

    await user.click(screen.getByText("Todos"));
    expect(handleChange).toHaveBeenCalledWith("all");
  });

  it("calls onChange with 'active' when Activos chip is clicked", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterChipsBar value="all" onChange={handleChange} />);

    await user.click(screen.getByText("Activos"));
    expect(handleChange).toHaveBeenCalledWith("active");
  });

  it("calls onChange with 'inactive' when Inactivos chip is clicked", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterChipsBar value="all" onChange={handleChange} />);

    await user.click(screen.getByText("Inactivos"));
    expect(handleChange).toHaveBeenCalledWith("inactive");
  });

  it("renders filter icon by default", () => {
    const { container } = render(<FilterChipsBar value="all" onChange={() => {}} />);

    const icon = container.querySelector('[data-testid="FilterListIcon"]');
    expect(icon).toBeInTheDocument();
  });

  it("does not render filter icon when showIcon is false", () => {
    const { container } = render(
      <FilterChipsBar value="all" onChange={() => {}} showIcon={false} />
    );

    const icon = container.querySelector('[data-testid="FilterListIcon"]');
    expect(icon).not.toBeInTheDocument();
  });
});
