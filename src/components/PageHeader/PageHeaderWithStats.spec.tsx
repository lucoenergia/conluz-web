import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PageHeaderWithStats } from "./PageHeaderWithStats";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

describe("PageHeaderWithStats", () => {
  const mockStats = [
    { value: 10, label: "Total" },
    { value: 8, label: "Active", color: "#10b981" },
    { value: 2, label: "Inactive", color: "#ef4444" },
  ];

  it("renders title and subtitle", () => {
    render(
      <PageHeaderWithStats
        icon={ElectricMeterIcon}
        title="Supply Points"
        subtitle="Manage energy community supply points"
        stats={mockStats}
      />
    );

    expect(screen.getByText("Supply Points")).toBeInTheDocument();
    expect(screen.getByText("Manage energy community supply points")).toBeInTheDocument();
  });

  it("renders all stats with labels and values", () => {
    render(
      <PageHeaderWithStats
        icon={ElectricMeterIcon}
        title="Supply Points"
        subtitle="Manage energy community supply points"
        stats={mockStats}
      />
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders with custom background color", () => {
    const { container } = render(
      <PageHeaderWithStats
        icon={ElectricMeterIcon}
        title="Supply Points"
        subtitle="Manage energy community supply points"
        stats={mockStats}
        bgColor="#ff0000"
      />
    );

    const paper = container.querySelector(".MuiPaper-root");
    expect(paper).toHaveStyle({ background: "#ff0000" });
  });

  it("renders with default background color when not specified", () => {
    const { container } = render(
      <PageHeaderWithStats
        icon={ElectricMeterIcon}
        title="Supply Points"
        subtitle="Manage energy community supply points"
        stats={mockStats}
      />
    );

    const paper = container.querySelector(".MuiPaper-root");
    expect(paper).toHaveStyle({ background: "#667eea" });
  });

  it("renders empty stats array without errors", () => {
    render(
      <PageHeaderWithStats
        icon={ElectricMeterIcon}
        title="Supply Points"
        subtitle="Manage energy community supply points"
        stats={[]}
      />
    );

    expect(screen.getByText("Supply Points")).toBeInTheDocument();
  });
});
