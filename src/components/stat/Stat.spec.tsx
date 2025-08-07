import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Stat } from "./Stat";

test("Header gets render and menu fn triggered", async () => {
  render(
    <Stat label="Label" value="Value"/>
  );
  const label = screen.getByText("Label");
  const value = screen.getByText('Value');
  // The text is rendered
  expect(label).toBeInTheDocument();
  // The value is rendered
  expect(value).toBeInTheDocument();
  // The value is rendered after the label
  expect(value.compareDocumentPosition(label)).toBe(2);
  

});
