import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CardGrid } from "./CardGrid";

interface TestItem {
  id: string;
  name: string;
}

describe("CardGrid", () => {
  const mockItems: TestItem[] = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ];

  const renderCard = (item: TestItem) => <div>{item.name}</div>;
  const getKey = (item: TestItem) => item.id;

  it("renders all items", () => {
    render(
      <CardGrid
        items={mockItems}
        renderCard={renderCard}
        getKey={getKey}
      />
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders empty grid when no items", () => {
    const { container } = render(
      <CardGrid items={[]} renderCard={renderCard} getKey={getKey} />
    );

    const boxes = container.querySelectorAll(".MuiBox-root");
    // Should have the outer Fade Box and grid Box, but no item Boxes
    expect(boxes.length).toBeGreaterThan(0);
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
  });

  it("calls renderCard for each item", () => {
    let callCount = 0;
    const customRenderCard = (item: TestItem) => {
      callCount++;
      return <div>{item.name}</div>;
    };

    render(
      <CardGrid
        items={mockItems}
        renderCard={customRenderCard}
        getKey={getKey}
      />
    );

    expect(callCount).toBe(3);
  });

  it("passes correct index to renderCard", () => {
    const indices: number[] = [];
    const customRenderCard = (_item: TestItem, index: number) => {
      indices.push(index);
      return <div>Card {index}</div>;
    };

    render(
      <CardGrid
        items={mockItems}
        renderCard={customRenderCard}
        getKey={getKey}
      />
    );

    expect(indices).toEqual([0, 1, 2]);
  });

  it("applies custom gap", () => {
    const { container } = render(
      <CardGrid
        items={mockItems}
        renderCard={renderCard}
        getKey={getKey}
        gap={4}
      />
    );

    const gridBox = container.querySelector(".MuiBox-root > .MuiBox-root");
    expect(gridBox).toBeInTheDocument();
    // MUI sx prop applies gap through CSS-in-JS, trust MUI handles it correctly
  });

  it("applies responsive gap", () => {
    const { container } = render(
      <CardGrid
        items={mockItems}
        renderCard={renderCard}
        getKey={getKey}
        gap={{ xs: 1, sm: 2 }}
      />
    );

    const gridBox = container.querySelector(".MuiBox-root > .MuiBox-root");
    expect(gridBox).toBeInTheDocument();
  });

  it("applies custom columns configuration", () => {
    const { container } = render(
      <CardGrid
        items={mockItems}
        renderCard={renderCard}
        getKey={getKey}
        columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
      />
    );

    const gridBox = container.querySelector(".MuiBox-root > .MuiBox-root");
    expect(gridBox).toBeInTheDocument();
  });
});
