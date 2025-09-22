import "@testing-library/jest-dom";
import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { LabeledIcon } from "./LabeledIcon";
import PersonIcon from "@mui/icons-material/Person";

test("Renderes Labeled Icon", async () => {
  render(<LabeledIcon label="Mi perfil" icon={PersonIcon} />);
  const label = screen.getByText("Mi perfil");
  const icon = screen.getByTestId("PersonIcon");
  // The text is rendered
  expect(label).toBeInTheDocument();
  // The icon is rendered
  expect(icon).toBeInTheDocument();
  // The icon is rendered before the label https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
  expect(icon.compareDocumentPosition(label)).toBe(4);
});

test('Renderes Labeled Icon with position "right"', async () => {
  render(<LabeledIcon label="Mi perfil" icon={PersonIcon} iconPosition="right" />);
  const label = screen.getByText("Mi perfil");
  const icon = screen.getByTestId("PersonIcon");
  // The text is rendered
  expect(label).toBeInTheDocument();
  // The icon is rendered
  expect(icon).toBeInTheDocument();
  // The icon is rendered after the label
  expect(icon.compareDocumentPosition(label)).toBe(2);
});
