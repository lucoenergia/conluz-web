import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ListTable, type ListTableProps } from "./ListTable";

type Row = { id: string; name: string; selectable: boolean };

const ROWS: Row[] = [
  { id: "a", name: "Ana García", selectable: true },
  { id: "b", name: "Bruno Leal", selectable: false },
];

const baseProps: ListTableProps<Row> = {
  rows: ROWS,
  getRowKey: (row) => row.id,
  title: { header: "Nombre", text: (row) => row.name },
  columns: [],
  isLoading: false,
  rowActions: { label: (row) => `Más acciones para ${row.name}`, onClick: vi.fn() },
};

const selection: ListTableProps<Row>["selection"] = {
  header: <input type="checkbox" aria-label="Seleccionar todo" />,
  render: (row) => (row.selectable ? <input type="checkbox" aria-label={`Seleccionar ${row.name}`} /> : null),
};

describe("ListTable", () => {
  it("renders no selection column without a selection", () => {
    render(<ListTable {...baseProps} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("leads with the selection column: the header's control, and each row's own", () => {
    render(<ListTable {...baseProps} selection={selection} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3);
    expect(within(headers[0]).getByRole("checkbox", { name: "Seleccionar todo" })).toBeInTheDocument();

    const [, anaRow, brunoRow] = screen.getAllByRole("row");
    expect(within(within(anaRow).getAllByRole("cell")[0]).getByRole("checkbox", { name: "Seleccionar Ana García" }))
      .toBeInTheDocument();
    expect(within(brunoRow).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(brunoRow).getAllByRole("cell")).toHaveLength(3);
  });
});

/** Where the router is, so a test can tell whether a click navigated. */
const LocationProbe = () => <output aria-label="Ubicación">{useLocation().pathname}</output>;
const location = () => screen.getByRole("status", { name: "Ubicación" });

/** The text a user gets by selecting all of `element`. */
const selectedText = (element: HTMLElement) => {
  const selection = window.getSelection()!;
  selection.selectAllChildren(element);
  return selection.toString();
};

describe("UI-LST-002 only the name links to a record's detail", () => {
  type Supply = { id: string; name: string; cups: string; owner: string };
  const SUPPLIES: Supply[] = [
    { id: "s1", name: "Casa de Ana", cups: "ES0021000000000001AB", owner: "Ana García" },
    { id: "s2", name: "Local de Bruno", cups: "ES0021000000000002CD", owner: "Bruno Leal" },
  ];
  const props: ListTableProps<Supply> = {
    rows: SUPPLIES,
    getRowKey: (supply) => supply.id,
    title: {
      header: "Nombre",
      text: (supply) => supply.name,
      href: (supply) => `/supplies/${supply.id}`,
      secondary: (supply) => [supply.cups],
    },
    columns: [{ key: "owner", header: "Titular", render: (supply) => supply.owner }],
    isLoading: false,
  };

  it("UI-LST-002 navigates from the name link to the record's detail", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ListTable {...props} />
        <LocationProbe />
      </>,
      { route: "/supplies" },
    );

    await user.click(screen.getByRole("link", { name: "Local de Bruno" }));

    expect(location()).toHaveTextContent("/supplies/s2");
  });

  it("UI-LST-002 does not navigate from a secondary line or another cell, whose text can be selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ListTable {...props} />
        <LocationProbe />
      </>,
      { route: "/supplies" },
    );

    await user.click(screen.getByText("ES0021000000000001AB"));
    await user.click(screen.getByText("Ana García"));

    expect(location()).toHaveTextContent(/^\/supplies$/);
    expect(selectedText(screen.getByText("ES0021000000000001AB"))).toBe("ES0021000000000001AB");
    expect(selectedText(screen.getByText("Ana García"))).toBe("Ana García");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("UI-LST-002 renders the name as plain text where no detail route exists", () => {
    renderWithProviders(<ListTable {...props} title={{ ...props.title, href: undefined }} />);

    expect(screen.getByText("Casa de Ana")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("UI-LST-003 the actions column", () => {
  type Member = { id: string; name: string; actionable: boolean };
  const MEMBERS: Member[] = [
    { id: "a", name: "Ana García", actionable: true },
    { id: "b", name: "Bruno Leal", actionable: false },
    { id: "c", name: "Carla Mas", actionable: true },
  ];
  const props: ListTableProps<Member> = {
    rows: MEMBERS,
    getRowKey: (member) => member.id,
    title: { header: "Nombre", text: (member) => member.name },
    columns: [{ key: "id", header: "Id", render: (member) => member.id }],
    isLoading: false,
    rowActions: {
      label: (member) => `Más acciones para ${member.name}`,
      onClick: vi.fn(),
      has: (member) => member.actionable,
    },
  };
  const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

  it("UI-LST-003 draws no actions column and no kebab when no row has actions", () => {
    render(<ListTable {...props} rowActions={{ ...props.rowActions!, has: () => false }} />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Nombre", "Id"]);
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    for (const member of MEMBERS) expect(within(rowOf(member.name)).getAllByRole("cell")).toHaveLength(2);
  });

  it("UI-LST-003 draws no actions column for a read-only list", () => {
    render(<ListTable {...props} rowActions={undefined} />);

    expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("UI-LST-003 keeps the column for mixed rows, with an empty cell where a row has no actions", () => {
    render(<ListTable {...props} />);

    // Named for screen readers, not drawn.
    const header = screen.getByRole("columnheader", { name: "Acciones" });
    expect(within(header).getByText("Acciones")).toHaveStyle({ position: "absolute", width: "1px", height: "1px" });

    expect(within(rowOf("Ana García")).getByRole("button", { name: "Más acciones para Ana García" })).toBeInTheDocument();
    expect(within(rowOf("Carla Mas")).getByRole("button", { name: "Más acciones para Carla Mas" })).toBeInTheDocument();
    const brunoCells = within(rowOf("Bruno Leal")).getAllByRole("cell");
    expect(brunoCells).toHaveLength(3);
    expect(brunoCells[2]).toBeEmptyDOMElement();
  });

  it("UI-LST-003 reserves the column while loading, so the table does not shift when the rows arrive", () => {
    const { container } = render(<ListTable {...props} rows={[]} isLoading loadingRows={2} />);

    const header = screen.getByRole("columnheader", { name: "Acciones" });
    expect(within(header).getByText("Acciones")).toHaveStyle({ position: "absolute", width: "1px", height: "1px" });
    const skeletonRows = container.querySelectorAll("tbody tr");
    expect(skeletonRows).toHaveLength(2);
    for (const row of skeletonRows) {
      const cells = row.querySelectorAll("td");
      expect(cells).toHaveLength(3);
      expect(cells[2]).toBeEmptyDOMElement();
    }
  });

  it("UI-LST-003 drops the reserved column once loaded rows have no actions", () => {
    const { rerender } = render(<ListTable {...props} rows={[]} isLoading />);
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();

    rerender(<ListTable {...props} rowActions={{ ...props.rowActions!, has: () => false }} />);

    expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();
  });
});
