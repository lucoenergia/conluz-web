import "@testing-library/jest-dom";
import { expect, test } from "vitest";
import { screen, render } from "@testing-library/react";
import { PasswordInput } from "./PasswordInput";
import userEvent from "@testing-library/user-event";

test("PasswordInput renders correctly", async () => {
  render(<PasswordInput placeholder="Password" />);
  expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
});

test("PasswordInput renders correctly and displays text when button clicked", async () => {
  render(<PasswordInput placeholder="Password" />);
  const input = screen.getByPlaceholderText("Password");
  const user = userEvent.setup();
  expect(input).toBeInTheDocument();
  expect(input).toHaveAttribute("type", "password");
  await user.click(screen.getByRole("button"));
  expect(input).toHaveAttribute("type", "text");
});
