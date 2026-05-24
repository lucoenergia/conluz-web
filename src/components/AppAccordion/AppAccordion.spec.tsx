import "@testing-library/jest-dom";
import { expect, test } from "vitest";
import { screen, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppAccordion } from "./AppAccordion";

test("AppAccordion renders correctly with content hidden", async () => {
  render(<AppAccordion title="Title">Content text</AppAccordion>);
  expect(screen.getByText("Title")).toBeVisible();
  expect(screen.getByText("Content text")).not.toBeVisible();
});

test("AppAccordion expands content when clicking", async () => {
  const user = userEvent.setup();
  render(<AppAccordion title="Title">Content text</AppAccordion>);
  await user.click(screen.getByRole("button"));
  expect(screen.getByText("Title")).toBeVisible();
  expect(screen.getByText("Content text")).toBeVisible();
});

test("AppAccordion collapses content when clicking in expanded state", async () => {
  const user = userEvent.setup();
  render(<AppAccordion title="Title">Content text</AppAccordion>);
  await user.click(screen.getByRole("button")); // Expand
  await user.click(screen.getByRole("button")); // Collapse
  expect(screen.getByText("Title")).toBeVisible();
  expect(screen.getByText("Content text")).not.toBeVisible();
});
