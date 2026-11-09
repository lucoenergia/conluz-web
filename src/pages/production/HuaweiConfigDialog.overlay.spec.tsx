import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { declaredStyles, hasOverlayEntry, pressBack, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { GetHuaweiConfigResponse } from "../../api/models";
import { PlantIntegrationsSection } from "./PlantIntegrationsSection";
import { USERNAME_REQUIRED_MESSAGE } from "../../utils/integrationCredentials";

/**
 * The Huawei configuration on the shared overlay (#371), opened from the
 * plant's integrations section, in create mode (no configuration yet) and in
 * edit mode.
 *
 * Tier 2: the real generated hooks and actions layer run, so a save is held in
 * flight by a request that does not answer.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const PLANT_ID = "plant-1";
const CONFIG_URL = `/api/v1/plants/${PLANT_ID}/production/huawei/config`;
const CREATE_TITLE = "Configurar integración con Huawei";
const EDIT_TITLE = "Editar integración con Huawei";
const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

const STORED: GetHuaweiConfigResponse = {
  enabled: false,
  username: "huawei-user",
  baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
  passwordSet: true,
};

type Mode = "create" | "edit";

/** The stored configuration, or none (a 404) in create mode; a save never answers unless told to. */
function serve(mode: Mode, save: () => unknown = () => new Promise(() => {})) {
  const router = routeRequests([
    {
      method: "GET",
      url: CONFIG_URL,
      respond: () => {
        if (mode === "create") throw apiError(404, { code: "HUAWEI_CONFIG_NOT_FOUND" });
        return STORED;
      },
    },
    { method: "PUT", url: CONFIG_URL, respond: save },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const plant = buildPlant({ id: PLANT_ID, capabilities: buildPlantCapabilities({ canRead: true, canManage: true }) });

async function renderSection() {
  renderWithProviders(
    <Routes>
      <Route path="/production/:plantId" element={<PlantIntegrationsSection plant={plant} />} />
    </Routes>,
    { route: `/production/${PLANT_ID}` },
  );
  await screen.findByRole("button", { name: /^(Configurar|Editar)$/ });
}

type User = ReturnType<typeof userEvent.setup>;

const titleOf = (mode: Mode) => (mode === "create" ? CREATE_TITLE : EDIT_TITLE);

async function openDialog(u: User, mode: Mode) {
  await u.click(screen.getByRole("button", { name: mode === "create" ? "Configurar" : "Editar" }));
  const dialog = await screen.findByRole("dialog", { name: titleOf(mode) });
  await act(() => overlayHistorySettled());
  return dialog;
}

const field = (dialog: HTMLElement, label: string) => within(dialog).getByLabelText(label);

async function fillCreate(u: User, dialog: HTMLElement) {
  await u.type(field(dialog, "Usuario"), "huawei-user");
  await u.type(field(dialog, "Contraseña"), "s3cret");
  await u.type(field(dialog, "URL del servicio"), "https://eu5.fusionsolar.huawei.com/thirdData");
}

const puts = (requests: RequestConfig[]) => requests.filter((r) => r.method?.toUpperCase() === "PUT");

beforeEach(() => {
  mockCustomInstance.mockReset();
  stubViewport(900);
});

afterEach(async () => {
  // An overlay left open gives its history entry back on unmount: let that
  // back land before the next test reads the history.
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-OVL-001 the Huawei configuration: a sheet below md, a form dialog from md up", () => {
  it("UI-OVL-001 renders as a sheet at 899 px and as a form dialog at 900 px", async () => {
    stubViewport(899);
    serve("edit");
    await renderSection();
    expect(await openDialog(userEvent.setup(), "edit")).toHaveClass("MuiDrawer-paperAnchorBottom");
    cleanup();
    await act(() => overlayHistorySettled());

    stubViewport(900);
    serve("edit");
    await renderSection();
    const dialog = await openDialog(userEvent.setup(), "edit");
    expect(dialog).toHaveClass("MuiDialog-paper");
    expect(declaredStyles(dialog)).toContain("width:560px");
  });

  it("UI-OVL-001 is a bottom sheet at 390 px, not a full-screen dialog", async () => {
    stubViewport(390);
    serve("create");
    await renderSection();

    const dialog = await openDialog(userEvent.setup(), "create");

    expect(dialog).toHaveClass("MuiDrawer-paperAnchorBottom");
    expect(dialog).not.toHaveClass("MuiDialog-paperFullScreen");
  });
});

describe("UI-OVL-002 the Huawei configuration stays open while it saves, its fields read-only", () => {
  it.each(["create", "edit"] as const)("UI-OVL-002 in %s mode, Escape, the backdrop and back keep it open", async (mode) => {
    const u = userEvent.setup();
    serve(mode);
    await renderSection();
    const dialog = await openDialog(u, mode);
    if (mode === "create") await fillCreate(u, dialog);
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByRole("button", { name: "Guardando..." })).toBeDisabled();
    const stillOpen = () => expect(screen.getByRole("dialog", { name: titleOf(mode) })).toBe(dialog);

    fireEvent.keyDown(dialog, { key: "Escape" });
    stillOpen();
    // Structural: the backdrop has no role or name; it is MUI's own element.
    await u.click(document.querySelector(".MuiBackdrop-root") as HTMLElement);
    stillOpen();
    await pressBack();
    stillOpen();

    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled();
    // By label: the password field has no textbox role.
    for (const label of ["Usuario", "Contraseña", "URL del servicio"]) {
      expect(field(dialog, label)).toHaveAttribute("readonly");
    }
  });
});

const CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe.each(["create", "edit"] as const)("UI-OVL-003 the Huawei configuration in %s mode", (mode) => {
  it.each(CLOSE_ATTEMPTS)("UI-OVL-003 with a changed field, %s asks first and keeps the input", async (_, attempt) => {
    const u = userEvent.setup();
    serve(mode);
    await renderSection();
    const dialog = await openDialog(u, mode);
    await u.type(field(dialog, "Contraseña"), "x");

    await attempt(u, dialog);

    expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
    expect(screen.getByRole("dialog", { name: titleOf(mode) })).toBe(dialog);
    expect(field(dialog, "Contraseña")).toHaveValue("x");
  });

  it.each(CLOSE_ATTEMPTS)("UI-OVL-003 unchanged, %s closes directly", async (_, attempt) => {
    const u = userEvent.setup();
    serve(mode);
    await renderSection();
    const dialog = await openDialog(u, mode);

    await attempt(u, dialog);

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });

  it("UI-OVL-003 a field changed and changed back counts as unchanged", async () => {
    const u = userEvent.setup();
    serve(mode);
    await renderSection();
    const dialog = await openDialog(u, mode);
    const username = field(dialog, "Usuario");
    const opened = (username as HTMLInputElement).value;
    await u.type(username, "z");
    await u.type(username, "{Backspace}");
    expect(username).toHaveValue(opened);

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
  });
});

describe("UI-OVL-004 back closes the Huawei configuration, not the plant detail page", () => {
  async function renderRouted() {
    window.history.replaceState(null, "", "/start");
    window.history.pushState(null, "", `/production/${PLANT_ID}`);
    renderWithProviders(
      <Routes>
        <Route path="/start" element={<p>Inicio</p>} />
        <Route path="/production/:plantId" element={<PlantIntegrationsSection plant={plant} />} />
      </Routes>,
      { browserHistory: true },
    );
    await screen.findByRole("button", { name: "Editar" });
    await act(() => overlayHistorySettled());
  }

  it("UI-OVL-004 back closes a clean dialog and the plant detail page stays", async () => {
    serve("edit");
    await renderRouted();
    await openDialog(userEvent.setup(), "edit");

    await pressBack();

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(window.location.pathname).toBe(`/production/${PLANT_ID}`);
    expect(screen.getByRole("region", { name: "Huawei" })).toBeInTheDocument();
    expect(hasOverlayEntry()).toBe(false);
  });

  it("UI-OVL-004 after Cancelar, one back leaves the plant detail page, with no dead step", async () => {
    const u = userEvent.setup();
    serve("edit");
    await renderRouted();
    const dialog = await openDialog(u, "edit");

    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await act(() => overlayHistorySettled());
    expect(window.location.pathname).toBe(`/production/${PLANT_ID}`);
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });
});

describe("UI-OVL-006 the Huawei configuration is named by its title", () => {
  it.each(["create", "edit"] as const)("UI-OVL-006 in %s mode, it is a dialog named by the heading it shows", async (mode) => {
    serve(mode);
    await renderSection();

    const dialog = await openDialog(userEvent.setup(), mode);

    expect(within(dialog).getByRole("heading", { name: titleOf(mode) })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(titleOf(mode));
  });
});

describe("Enter in a field saves the Huawei configuration (#371)", () => {
  it("sends the form when Enter is pressed in a field", async () => {
    const u = userEvent.setup();
    const router = serve("create", () => undefined);
    await renderSection();
    const dialog = await openDialog(u, "create");
    await fillCreate(u, dialog);

    await u.type(field(dialog, "URL del servicio"), "{Enter}");

    await waitFor(() => expect(puts(router.requests)).toHaveLength(1));
  });

  it("shows the field messages and sends nothing when Enter is pressed with a field missing", async () => {
    const u = userEvent.setup();
    const router = serve("create", () => undefined);
    await renderSection();
    const dialog = await openDialog(u, "create");
    await u.type(field(dialog, "Contraseña"), "s3cret");

    await u.type(field(dialog, "Contraseña"), "{Enter}");

    expect(await within(dialog).findByText(USERNAME_REQUIRED_MESSAGE)).toBeInTheDocument();
    expect(puts(router.requests)).toHaveLength(0);
  });
});
