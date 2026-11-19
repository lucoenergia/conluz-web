import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { stubViewport } from "../../test/overlay";
import { buildMemberRecord, buildSupply } from "../../test/fixtures";
import { cascadedValue } from "../../test/cascade";
import { SupplySelector } from "./SupplySelector";

const HOME = buildSupply({ id: "home", name: "Casa", code: "ES0021000000000001AA" });
const GARAGE = buildSupply({ id: "garage", name: "Garaje", code: "ES0021000000000002AA" });
const ALL = "Todos mis puntos";

function renderSelector(showAll?: boolean) {
  renderWithProviders(
    <SupplySelector supplies={[HOME, GARAGE]} selected={HOME} onSelect={() => {}} {...(showAll === undefined ? {} : { showAll })} />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SupplySelector's all-supplies option (#432)", () => {
  describe("from sm up, a dropdown", () => {
    const optionLabels = async () => {
      await userEvent.click(screen.getByRole("combobox", { name: "Punto de suministro" }));
      return within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent);
    };

    it("offers Todos mis puntos by default", async () => {
      stubViewport(1024);
      renderSelector();

      expect(await optionLabels()).toEqual([ALL, "Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
    });

    it("leaves it out with showAll={false}, and nothing else", async () => {
      stubViewport(1024);
      renderSelector(false);

      expect(await optionLabels()).toEqual(["Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
      expect(screen.getByText("Solo aparecen tus puntos activos en esta comunidad.")).toBeInTheDocument();
    });
  });

  describe("below sm, a bottom sheet", () => {
    const optionLabels = async () => {
      await userEvent.click(screen.getByRole("button", { name: /^Punto de suministro/ }));
      const sheet = screen.getByRole("dialog", { name: "Punto de suministro" });
      return within(sheet).getAllByRole("radio").map((radio) => radio.closest("label")!.textContent);
    };

    it("offers Todos mis puntos by default", async () => {
      stubViewport(390);
      renderSelector();

      expect(await optionLabels()).toEqual([ALL, "Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
    });

    it("leaves it out with showAll={false}, and nothing else", async () => {
      stubViewport(390);
      renderSelector(false);

      expect(await optionLabels()).toEqual(["Casa · ES0021000000000001AA", "Garaje · ES0021000000000002AA"]);
      expect(screen.getByText("Solo aparecen tus puntos activos en esta comunidad.")).toBeInTheDocument();
    });
  });
});

describe("SupplySelector's two-line supplies (#432)", () => {
  const LONG_NAME = "Nave industrial del polígono de La Charluca, parcela catorce";
  const OWNER = "Lucía Martínez Soler";
  const LONG = buildSupply({ id: "long", name: LONG_NAME, code: "ES0021000000000003AA" });
  const MEMBERS = buildSupply({
    id: "members",
    name: "Casa de Lucía",
    code: "ES0021000000000009AA",
    ownerRecord: buildMemberRecord({ fullName: OWNER }),
  });

  /** The two lines of a supply's content: the element holding its name, and the one holding its CUPS. */
  function lines(scope: HTMLElement, name: string, code: string) {
    const first = within(scope).getByText(name);
    const second = within(scope).getByText(code).parentElement!;
    return { first, second };
  }

  function renderSheet(props: { selected?: typeof HOME | null; viewed?: typeof HOME | null; showAll?: boolean } = {}) {
    stubViewport(390);
    renderWithProviders(
      <SupplySelector
        supplies={[HOME, LONG]}
        selected={props.selected === undefined ? HOME : props.selected}
        viewed={props.viewed ?? null}
        onSelect={() => {}}
        showAll={props.showAll}
      />,
    );
  }

  it("UI-HIS-001 shows an own supply's name on one line and its CUPS, in mono, on the next", () => {
    renderSheet();
    const trigger = screen.getByRole("button", { name: /^Punto de suministro/ });

    const { first, second } = lines(trigger, "Casa", HOME.code);
    expect(first).not.toContainElement(within(trigger).getByText(HOME.code));
    expect(second).toHaveTextContent(new RegExp(`^· ${HOME.code}$`));
    expect(cascadedValue(within(trigger).getByText(HOME.code), "font-family")).toMatch(/monospace/);
    expect(trigger).toHaveAccessibleName(`Punto de suministro Casa · ${HOME.code}`);
  });

  it("UI-HIS-001 shows the viewed supply's owner on its second line, after the CUPS", async () => {
    renderSheet({ selected: MEMBERS, viewed: MEMBERS });
    const trigger = screen.getByRole("button", { name: /^Punto de suministro/ });

    const { first, second } = lines(trigger, "Casa de Lucía", MEMBERS.code);
    expect(first).not.toHaveTextContent(OWNER);
    expect(second).toHaveTextContent(`${MEMBERS.code} · de ${OWNER}`);
    expect(trigger).toHaveAccessibleName(`Punto de suministro Casa de Lucía · ${MEMBERS.code} · de ${OWNER}`);

    await userEvent.click(trigger);
    const option = within(screen.getByRole("dialog", { name: "Punto de suministro" })).getByRole("radio", { name: /Casa de Lucía/ });
    expect(option.closest("label")).toHaveTextContent(`Casa de Lucía · ${MEMBERS.code} · de ${OWNER}`);
  });

  it("UI-HIS-001 keeps Todos mis puntos on a single line", () => {
    renderSheet({ selected: null });
    const trigger = screen.getByRole("button", { name: /^Punto de suministro/ });

    expect(trigger).toHaveTextContent(/^Todos mis puntos$/);
    expect(within(trigger).queryAllByText(/ES0021/)).toHaveLength(0);
  });

  it("UI-HIS-001 never truncates a long name: all of it is there, wrapping, with no ellipsis", async () => {
    stubViewport(1024);
    renderWithProviders(<SupplySelector supplies={[HOME, LONG]} selected={LONG} onSelect={() => {}} />);
    const field = screen.getByRole("combobox", { name: "Punto de suministro" });

    expect(LONG_NAME).toHaveLength(60);
    const name = within(field).getByText(LONG_NAME);
    expect(name).not.toHaveClass("MuiTypography-noWrap");
    expect(cascadedValue(name, "white-space")).toBe("normal");
    expect(cascadedValue(field, "white-space")).toBe("normal");
    expect(cascadedValue(name, "text-overflow")).not.toBe("ellipsis");

    await userEvent.click(field);
    const option = within(screen.getByRole("listbox")).getByRole("option", { name: new RegExp(LONG_NAME) });
    expect(within(option).getByText(LONG_NAME)).not.toHaveClass("MuiTypography-noWrap");
  });
});
