import { render, screen } from "@testing-library/react";
import { PaginatedList } from "./PaginatedList";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { SupplyCard } from "../SupplyCard/SupplyCard";

const mockItemList = [
  {
    code: "1",
    name: "Casa",
    address: "Calle Mayor 1",
    enabled: true,
    datadisValidDateFrom: "hoy",
    datadisPointType: "4.5",
  },
  {
    code: "2",
    name: "Garaje",
    address: "Calle Segunda",
    enabled: false,
    datadisValidDateFrom: "ayer",
    datadisPointType: "2.5",
  },
];

vi.mock("../SupplyCard/SupplyCard", () => ({
  SupplyCard: ({ name }: { name: string }) => <div>{name}</div>,
}));

describe("PaginatedList (unit)", () => {
  it("renders a list of SupplyCards based on itemList", () => {
    render(
      <PaginatedList>
        {mockItemList.map((item) => (
          <SupplyCard
            key={item.code}
            code={item.code}
            name={item.name}
            address={item.address}
            enabled={item.enabled}
            onDisable={async () => true}
            onEnable={async () => true}
          />
        ))}
      </PaginatedList>,
    );

    expect(screen.getByText("Casa")).toBeInTheDocument();
    expect(screen.getByText("Garaje")).toBeInTheDocument();
  });
});
