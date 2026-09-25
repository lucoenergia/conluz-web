import type { ChangeEvent } from "react";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { PaginationOutlined } from "./Pagination";

describe("PaginationOutlined (unit)", () => {
  it("renders pagination and starts on page 1", () => {
    renderWithProviders(<PaginationOutlined count={10} page={1} handleChange={() => {}} />);

    // The project theme's esES locale labels the current page "página 1".
    const currentPage = screen.getByRole("button", {
      name: "página 1",
    });

    expect(currentPage).toHaveAttribute("aria-current", "page");
  });

  it("updates to page 2 when clicked", () => {
    let page = 1;
    renderWithProviders(
      <PaginationOutlined
        count={10}
        page={page}
        handleChange={(_event: ChangeEvent<unknown>, value: number) => {
          page = value;
        }}
      />,
    );

    const page2Button = screen.getByRole("button", {
      name: "Ir a la página 2",
    });

    fireEvent.click(page2Button);
    expect(page).toBe(2);
  });
});
