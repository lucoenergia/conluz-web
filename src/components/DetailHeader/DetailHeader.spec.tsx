import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useMediaQuery } from "@mui/material";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import { DetailHeader, type DetailHeaderProps, type DetailKeyFacts, type DetailFact } from "./DetailHeader";

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");
  return { ...actual, useMediaQuery: vi.fn() };
});

const mockUseMediaQuery = useMediaQuery as unknown as ReturnType<typeof vi.fn>;

/** `useMediaQuery` is queried with `breakpoints.down("sm")`, so true means xs. */
const setViewport = (compact: boolean) => mockUseMediaQuery.mockReturnValue(compact);

/**
 * jsdom lays nothing out, so every element reports a scrollWidth of 0 and
 * nothing ever measures as clipped. These stubs stand in for the one fact the
 * component asks layout for.
 */
const stubTruncation = (isTruncated: boolean) => {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get: () => (isTruncated ? 240 : 100),
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 100 });
};

const THREE_FACTS: DetailKeyFacts = [
  { label: "POTENCIA", value: "63 kW" },
  { label: "CAU", value: "ES0031300325733001FH0FA000", copyable: "ES0031300325733001FH0FA000" },
  { label: "CREADO", value: "12 sep 2025" },
];

/** The plant's five details, the case the "+N" count is specified against. */
const FIVE_DETAILS: DetailFact[] = [
  { label: "Código de proveedor", value: "NE=35899672" },
  { label: "Proveedor de inversor", value: "HUAWEI" },
  { label: "Fecha de conexión", value: "20 abr 2024" },
  { label: "Punto de suministro vinculado", value: "ES0031300806333002ET0F" },
  { label: "Descripción", value: "Huerto solar Luco Energía", wide: true },
];

function renderHeader(props: Partial<DetailHeaderProps> = {}) {
  return render(
    <DetailHeader icon={<SolarPowerIcon />} title="21088 Luco de Jiloca" {...props} />,
  );
}

describe("DetailHeader", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockClear();
    setViewport(false);
  });

  afterEach(() => {
    // Back to jsdom's own zero-width world, so no test inherits a stub.
    Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  });

  describe("optional slots", () => {
    it("renders the identity row from the icon and title alone", () => {
      renderHeader();

      expect(screen.getByRole("heading", { level: 1, name: "21088 Luco de Jiloca" })).toBeInTheDocument();
    });

    it("keeps the full label where there is room for it", () => {
      renderHeader({
        keyFacts: [{ label: "Potencia instalada", shortLabel: "Potencia", value: "120,50 kW" }],
      });

      expect(screen.getByText("Potencia instalada")).toBeInTheDocument();
    });

    it("renders no strip when there is neither a key fact nor a detail", () => {
      const { container } = renderHeader();

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      // Nothing between the identity row and the live region.
      expect(container.querySelectorAll(".MuiPaper-root > div")).toHaveLength(2);
    });

    // AC4.
    it("renders no toggle when the entity has no details", () => {
      renderHeader({ keyFacts: [{ label: "POTENCIA", value: "63 kW" }] });

      expect(screen.getByText("63 kW")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ver \d+ dato/ })).not.toBeInTheDocument();
    });

    it("renders no action area when no menu is supplied", () => {
      renderHeader({ keyFacts: [{ label: "POTENCIA", value: "63 kW" }] });

      expect(screen.queryByRole("button", { name: "Más opciones" })).not.toBeInTheDocument();
    });

    it("renders the menu, status and subtitle when supplied", () => {
      renderHeader({
        status: <span>Borrador</span>,
        subtitle: "Calle Callejas 4, 44391, Luco de Jiloca, Teruel",
        menu: <button type="button">Más opciones</button>,
      });

      expect(screen.getByText("Borrador")).toBeInTheDocument();
      expect(screen.getByText("Calle Callejas 4, 44391, Luco de Jiloca, Teruel")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Más opciones" })).toBeInTheDocument();
    });
  });

  // AC13.
  describe("loading and error", () => {
    it("renders neither the strip nor the details while loading", () => {
      renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS, isLoading: true });

      expect(screen.queryByText("63 kW")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ver \d+ dato/ })).not.toBeInTheDocument();
    });

    it("renders neither the strip nor the details on error", () => {
      renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS, error: new Error("boom") });

      expect(screen.queryByText("63 kW")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ver \d+ dato/ })).not.toBeInTheDocument();
    });

    it("withholds the status badge and the menu until the data resolves", () => {
      renderHeader({
        status: <span>Borrador</span>,
        menu: <button type="button">Más opciones</button>,
        isLoading: true,
      });

      expect(screen.queryByText("Borrador")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Más opciones" })).not.toBeInTheDocument();
    });
  });

  // AC3.
  describe("the details toggle", () => {
    it("starts collapsed and expands and collapses again", async () => {
      const user = userEvent.setup();
      renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS });

      const toggle = screen.getByRole("button", { name: "Ver 5 datos más" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("HUAWEI")).not.toBeInTheDocument();

      await user.click(toggle);

      const expanded = screen.getByRole("button", { name: "Ocultar detalles" });
      expect(expanded).toHaveAttribute("aria-expanded", "true");
      const panel = document.getElementById(expanded.getAttribute("aria-controls") as string) as HTMLElement;
      expect(panel).toHaveTextContent("HUAWEI");

      await user.click(expanded);
      expect(screen.getByRole("button", { name: "Ver 5 datos más" })).toHaveAttribute("aria-expanded", "false");
    });

    it("says 'dato' rather than 'datos' when a single item is hidden", () => {
      renderHeader({ keyFacts: THREE_FACTS, details: [FIVE_DETAILS[0]] });

      expect(screen.getByRole("button", { name: "Ver 1 dato más" })).toBeInTheDocument();
    });

    it("is not persisted across mounts", async () => {
      const user = userEvent.setup();
      const { unmount } = renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS });

      await user.click(screen.getByRole("button", { name: "Ver 5 datos más" }));
      unmount();
      renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS });

      expect(screen.getByRole("button", { name: "Ver 5 datos más" })).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("on a narrow viewport", () => {
    beforeEach(() => setViewport(true));

    // AC5.
    it("keeps two key facts in the strip and moves the third to the top of the details", async () => {
      const user = userEvent.setup();
      renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS });

      expect(screen.getByText("63 kW")).toBeInTheDocument();
      expect(screen.queryByText("12 sep 2025")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Ver \d+ datos más/ }));

      const panel = screen.getByText("12 sep 2025").closest("[id]") as HTMLElement;
      const labels = Array.from(panel.querySelectorAll(".MuiTypography-caption")).map((node) => node.textContent);
      expect(labels[0]).toBe("CREADO");
    });

    it("counts the displaced key fact among the hidden items", () => {
      renderHeader({ keyFacts: THREE_FACTS, details: FIVE_DETAILS });

      expect(screen.getByRole("button", { name: "Ver 6 datos más" })).toBeInTheDocument();
    });

    /**
     * The plant keeps both of its key facts on xs, so only its five details are
     * hidden. The CAU is repeated in the details when it truncates, but it is
     * still on screen — counting it would promise a sixth thing to reveal.
     */
    it("shows +5 for the plant, not +6: a mirrored copyable value is not hidden", () => {
      stubTruncation(true);
      renderHeader({ keyFacts: [THREE_FACTS[0], THREE_FACTS[1]], details: FIVE_DETAILS });

      expect(screen.getByText("+5")).toBeInTheDocument();
      expect(screen.queryByText("+6")).not.toBeInTheDocument();
    });

    it("uses the short label, so a long one cannot crowd out the value it names", () => {
      renderHeader({
        keyFacts: [{ label: "Potencia instalada", shortLabel: "Potencia", value: "120,50 kW" }],
        details: FIVE_DETAILS,
      });

      expect(screen.getByText("Potencia")).toBeInTheDocument();
      expect(screen.queryByText("Potencia instalada")).not.toBeInTheDocument();
      expect(screen.getByText("120,50 kW")).toBeInTheDocument();
    });

    it("shows the bare count but keeps the sentence as the accessible name", () => {
      renderHeader({ keyFacts: [THREE_FACTS[0]], details: FIVE_DETAILS });

      const toggle = screen.getByRole("button", { name: "Ver 5 datos más" });
      expect(toggle).toHaveTextContent("+5");
    });
  });

  describe("repeating a truncated value in the details", () => {
    const expand = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: /^Ver \d+ dato/ }));
      return document.getElementById(
        screen.getByRole("button", { name: "Ocultar detalles" }).getAttribute("aria-controls") as string,
      ) as HTMLElement;
    };

    it("repeats a copyable value in full once it has actually lost characters", async () => {
      stubTruncation(true);
      const user = userEvent.setup();
      renderHeader({ keyFacts: [THREE_FACTS[1]], details: FIVE_DETAILS });

      const panel = await expand(user);
      expect(panel).toHaveTextContent("ES0031300325733001FH0FA000");
    });

    /**
     * The supply header has one key fact, so its CUPS has the whole strip and is
     * never clipped. Repeating it anyway printed the same CUPS twice, once in
     * the strip and once right below it.
     */
    it("does not repeat a copyable value that fits", async () => {
      stubTruncation(false);
      const user = userEvent.setup();
      renderHeader({ keyFacts: [THREE_FACTS[1]], details: FIVE_DETAILS });

      const panel = await expand(user);
      expect(panel).not.toHaveTextContent("ES0031300325733001FH0FA000");
      // The details themselves are untouched.
      expect(panel).toHaveTextContent("HUAWEI");
    });

    it("never repeats a value that has no copy button, however long it is", async () => {
      stubTruncation(true);
      const user = userEvent.setup();
      renderHeader({
        keyFacts: [{ label: "Descripción", value: "Instalación fotovoltaica comunitaria" }],
        details: FIVE_DETAILS,
      });

      const panel = await expand(user);
      expect(panel).not.toHaveTextContent("Instalación fotovoltaica comunitaria");
    });
  });

  // AC6, AC2.
  describe("copying a key fact", () => {
    const writeText = vi.fn();

    /**
     * jsdom exposes `navigator.clipboard` as a getter, and `userEvent.setup()`
     * installs a stub of its own — so the override has to be defined, not
     * assigned, and has to come after setup rather than in a `beforeEach`.
     */
    const stubClipboard = (clipboard: unknown) =>
      Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true, writable: true });

    beforeEach(() => {
      writeText.mockReset().mockResolvedValue(undefined);
    });

    it("renders no copy button for a fact that is not copyable", () => {
      renderHeader({ keyFacts: [{ label: "POTENCIA", value: "-" }] });

      expect(screen.queryByRole("button", { name: /^Copiar/ })).not.toBeInTheDocument();
    });

    it("writes the value and announces it through a live region", async () => {
      const user = userEvent.setup();
      stubClipboard({ writeText });
      renderHeader({ keyFacts: THREE_FACTS });

      await user.click(screen.getByRole("button", { name: "Copiar CAU" }));

      expect(writeText).toHaveBeenCalledWith("ES0031300325733001FH0FA000");
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("CAU copiado al portapapeles");
      });
      // Visible confirmation too, not only the announcement: the icon swaps to
      // a tick. A tooltip would not do — it never appears for a touch user.
      expect(screen.getByRole("button", { name: "Copiar CAU" }).querySelector('[data-testid="CheckIcon"]')).toBeInTheDocument();
    });

    it("announces nothing and claims no success when the clipboard rejects", async () => {
      writeText.mockRejectedValue(new Error("not allowed"));
      const user = userEvent.setup();
      stubClipboard({ writeText });
      renderHeader({ keyFacts: THREE_FACTS });

      await user.click(screen.getByRole("button", { name: "Copiar CAU" }));

      await waitFor(() => expect(writeText).toHaveBeenCalled());
      expect(screen.getByRole("status")).toHaveTextContent("");
      expect(screen.getByRole("status")).not.toHaveTextContent("copiado");
      // ...and no tick either: the visible signal must not outrun the fact.
      const button = screen.getByRole("button", { name: "Copiar CAU" });
      expect(button.querySelector('[data-testid="CheckIcon"]')).not.toBeInTheDocument();
      expect(button.querySelector('[data-testid="ContentCopyIcon"]')).toBeInTheDocument();
    });

    it("survives a browser with no clipboard at all, without claiming success", async () => {
      const user = userEvent.setup();
      stubClipboard(undefined);
      renderHeader({ keyFacts: THREE_FACTS });

      await user.click(screen.getByRole("button", { name: "Copiar CAU" }));

      expect(screen.getByRole("status")).not.toHaveTextContent("copiado");
    });
  });

  describe("the title", () => {
    it("is an h1 that a page can take focus to", () => {
      const titleRef = { current: null } as { current: HTMLHeadingElement | null };
      renderHeader({ titleRef });

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveAttribute("tabindex", "-1");
      expect(titleRef.current).toBe(heading);
    });

    it("carries no tabindex when no page asked to focus it", () => {
      renderHeader();

      expect(screen.getByRole("heading", { level: 1 })).not.toHaveAttribute("tabindex");
    });
  });
});
