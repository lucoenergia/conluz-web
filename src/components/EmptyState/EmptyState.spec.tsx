import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

describe("EmptyState", () => {
  it("renders icon, title, and subtitle", () => {
    render(
      <EmptyState
        icon={ElectricMeterIcon}
        title="No items found"
        subtitle="Try adjusting your search"
      />
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your search")).toBeInTheDocument();
  });

  it("renders without subtitle when not provided", () => {
    render(
      <EmptyState
        icon={ElectricMeterIcon}
        title="No items found"
      />
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.queryByText("Try adjusting your search")).not.toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={ElectricMeterIcon}
        title="No items found"
        actionButton={{
          label: "Add New Item",
          onClick: handleClick,
          startIcon: <AddCircleOutlineIcon />,
        }}
      />
    );

    expect(screen.getByText("Add New Item")).toBeInTheDocument();
  });

  it("calls action button onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        icon={ElectricMeterIcon}
        title="No items found"
        actionButton={{
          label: "Add New Item",
          onClick: handleClick,
        }}
      />
    );

    await user.click(screen.getByText("Add New Item"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not render action button when not provided", () => {
    render(
      <EmptyState
        icon={ElectricMeterIcon}
        title="No items found"
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
