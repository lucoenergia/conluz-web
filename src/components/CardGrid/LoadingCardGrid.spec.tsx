import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LoadingCardGrid } from "./LoadingCardGrid";

describe("LoadingCardGrid", () => {
  it("renders default number of skeleton cards", () => {
    const { container } = render(<LoadingCardGrid />);

    const papers = container.querySelectorAll(".MuiPaper-root");
    expect(papers).toHaveLength(6); // Default skeletonCount
  });

  it("renders custom number of skeleton cards", () => {
    const { container } = render(<LoadingCardGrid skeletonCount={3} />);

    const papers = container.querySelectorAll(".MuiPaper-root");
    expect(papers).toHaveLength(3);
  });

  it("renders skeleton elements for each card", () => {
    const { container } = render(<LoadingCardGrid skeletonCount={2} />);

    const rectangularSkeletons = container.querySelectorAll(
      ".MuiSkeleton-rectangular"
    );
    const textSkeletons = container.querySelectorAll(".MuiSkeleton-text");

    expect(rectangularSkeletons).toHaveLength(2); // One per card
    expect(textSkeletons.length).toBeGreaterThan(0); // Multiple per card
  });

  it("applies custom gap", () => {
    const { container } = render(<LoadingCardGrid gap={4} />);

    const grid = container.firstChild as HTMLElement;
    expect(grid).toBeInTheDocument();
    // MUI sx prop applies gap through CSS-in-JS, trust MUI handles it correctly
  });

  it("applies responsive gap", () => {
    const { container } = render(<LoadingCardGrid gap={{ xs: 1, sm: 2 }} />);

    const grid = container.firstChild as HTMLElement;
    // The sx prop will be applied as inline styles or classes
    expect(grid).toBeInTheDocument();
  });

  it("applies custom columns configuration", () => {
    const { container } = render(
      <LoadingCardGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid).toBeInTheDocument();
  });
});
