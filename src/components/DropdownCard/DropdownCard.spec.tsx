import "@testing-library/jest-dom";
import { expect, test } from "vitest";
import { screen, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownCard } from "./DropdownCard";

test("DropdownCard renders correctly with content hidden", async () => {
  render(<DropdownCard title="Title">Content text</DropdownCard>);
  expect(screen.getByText("Title")).toBeVisible();
  expect(screen.getByText("Content text")).not.toBeVisible();
});

test("DropdownCard expands content when clicking", async () => {
  const user = userEvent.setup();
  render(<DropdownCard title="Title">Content text</DropdownCard>);
  await user.click(screen.getByRole("button"));
  expect(screen.getByText("Title")).toBeVisible();
  expect(screen.getByText("Content text")).toBeVisible();
});

test("DropdownCard collapses content when clicking in expanded state", async () => {
  const user = userEvent.setup();
  render(<DropdownCard title="Title">Content text</DropdownCard>);
  await user.click(screen.getByRole("button")); // Expand card
  await user.click(screen.getByRole("button")); // Collapse card
  expect(screen.getByText("Title")).toBeVisible();
  expect(screen.getByText("Content text")).not.toBeVisible();
});
