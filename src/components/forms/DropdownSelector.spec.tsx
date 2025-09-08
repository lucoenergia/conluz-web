import '@testing-library/jest-dom'
import { screen, render, waitFor } from "@testing-library/react";
import { DropdownSelector } from './DropdownSelector';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const testOptions = [
  { label: "First option", value: "1"},
  { label: "Second option", value: "2"},
  { label: "Third option", value: "3"},
  { label: "Fourth option", value: "4"}
]

test("Dropdown selector renders correctly and displays options", async () => {
  const user = userEvent.setup();
  render(<DropdownSelector options={testOptions} label='Selector' />);
  const selector = screen.getByLabelText('Selector');
  expect(selector).toBeVisible();
  await user.click(selector);
  expect(screen.getByText('First option')).toBeVisible();
  expect(screen.getByText('Second option')).toBeVisible();
  expect(screen.getByText('Third option')).toBeVisible();
  expect(screen.getByText('Fourth option')).toBeVisible();
});

test("Selected option is set", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn()
  render(<DropdownSelector options={testOptions} label='Selector' onChange={onChange} />);
  const selector = screen.getByLabelText('Selector');
  expect(selector).toBeVisible();
  await user.click(selector);
  await user.click(screen.getByText('First option'));
  expect(onChange).toHaveBeenCalledWith("1")
});

test("Initial value is set", async () => {
  render(<DropdownSelector options={testOptions} label='Selector' value="1" />);
  waitFor(() => {
  expect(screen.getByText('First option')).toBeVisible();
  });
});
