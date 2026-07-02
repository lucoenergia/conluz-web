import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { AttentionPanel, type AttentionItem } from "./AttentionPanel";

const renderPanel = (items: AttentionItem[]) =>
  render(
    <MemoryRouter>
      <AttentionPanel items={items} />
    </MemoryRouter>,
  );

const item = (overrides: Partial<AttentionItem> = {}): AttentionItem => ({
  key: "k",
  icon: <WarningAmberRoundedIcon />,
  label: "2 comunidades sin administrador",
  to: "/communities",
  ...overrides,
});

describe("AttentionPanel", () => {
  it("renders nothing when there are no items", () => {
    const { container } = renderPanel([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and a row per item with a Revisar link", () => {
    renderPanel([
      item({ key: "a", label: "2 comunidades sin administrador" }),
      item({ key: "b", label: "3 comunidades sin usuarios" }),
    ]);

    expect(screen.getByText("Requiere atención")).toBeInTheDocument();
    expect(screen.getByText("2 comunidades sin administrador")).toBeInTheDocument();
    expect(screen.getByText("3 comunidades sin usuarios")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /Revisar/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/communities");
  });
});
