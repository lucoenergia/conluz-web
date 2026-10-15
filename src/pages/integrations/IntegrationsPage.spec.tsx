import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import type { CommunityCapabilitiesResponse } from "../../api/models";

// Only the reads are replaced. The actions layer runs for real -- which is the
// point: what is under test is that each card follows the capabilities on the
// payload, and stubbing the action hooks would mean restating that rule in the
// test instead of exercising it. Mutation hooks are inert until called, so the
// one that is stubbed here is stubbed to assert its arguments, not to gate.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));
vi.mock(import("../../api/consumption/consumption"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetDatadisConfig: vi.fn(),
  useGetShellyConfig: vi.fn(),
  useConfigureDatadis: vi.fn(),
  useConfigureShelly: vi.fn(),
}));
// Mocked only to prove they are never called: Huawei lives on plant detail
// (#192), so this page reads no plant and no Huawei configuration.
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHuaweiConfig: vi.fn(),
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { useGetAllPlants } from "../../api/plants/plants";
import {
  getDatadisConfig,
  getShellyConfig,
  useConfigureDatadis,
  useConfigureShelly,
  useGetDatadisConfig,
  useGetShellyConfig,
} from "../../api/consumption/consumption";
import { useGetHuaweiConfig } from "../../api/production/production";
import { IntegrationsPage } from "./IntegrationsPage";

const COMMUNITY_ID = "community-a";

const mockConfigureDatadis = vi.fn().mockResolvedValue({});
const mockConfigureShelly = vi.fn().mockResolvedValue({});

function setup(
  options: {
    community?: Partial<CommunityCapabilitiesResponse>;
    communityLoading?: boolean;
  } = {},
) {
  const { community = {}, communityLoading = false } = options;

  vi.mocked(useGetCommunityById).mockReturnValue(
    communityLoading
      ? query.loading()
      : query.success<typeof getCommunityById>(
          buildCommunity({
            id: COMMUNITY_ID,
            capabilities: buildCommunityCapabilities({ canRead: true, ...community }),
          }),
        ),
  );
  return renderWithProviders(<IntegrationsPage />, { activeCommunityId: COMMUNITY_ID });
}

const card = (name: string) => screen.queryByRole("heading", { name });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGetDatadisConfig).mockReturnValue(
    // A stored password, so saving with the field empty is valid: the default
    // is the configured community, and the specs that need none override it.
    query.success<typeof getDatadisConfig>({
      enabled: true,
      passwordSet: true,
      username: "datadis-user",
      baseUrl: "https://datadis.example",
    }),
  );
  vi.mocked(useGetShellyConfig).mockReturnValue(query.success<typeof getShellyConfig>({ enabled: false }));
  vi.mocked(useConfigureDatadis).mockReturnValue(mutation.idle({ mutateAsync: mockConfigureDatadis }));
  vi.mocked(useConfigureShelly).mockReturnValue(mutation.idle({ mutateAsync: mockConfigureShelly }));
});

describe("IntegrationsPage", () => {
  describe("an admin of the community", () => {
    it("gets every integration it may configure", () => {
      setup({ community: { canManage: true } });

      expect(card("Datadis")).toBeInTheDocument();
      expect(card("Shelly")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Guardar" })).toHaveLength(2);
    });

    it("saves through the action, which carries the community it writes into", async () => {
      setup({ community: { canManage: true } });

      const datadis = screen.getByRole("heading", { name: "Datadis" }).closest(".MuiPaper-root") as HTMLElement;
      await userEvent.click(within(datadis).getByRole("button", { name: "Guardar" }));
      // Credentials are community configuration, so the save is confirmed
      // against the community it names first (#186). The gate is still what
      // decides the button exists at all.
      await userEvent.click(within(screen.getByTestId("modal-panel")).getByRole("button", { name: "Guardar" }));

      expect(mockConfigureDatadis).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: COMMUNITY_ID,
          data: expect.objectContaining({ username: "datadis-user" }),
        }),
      );
    });
  });

  describe("a member of the community", () => {
    it("is offered no integration to configure at all", () => {
      // Reading each configuration needs exactly what writing it needs, so
      // there is no read-only card to fall back to.
      setup({ community: { canManage: false } });

      expect(card("Datadis")).not.toBeInTheDocument();
      expect(card("Shelly")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
    });
  });

  describe("a platform admin who is not a member of this community", () => {
    it("gets nothing, because the flag is not a grant over a community's data", () => {
      // The platform flag never answers a community capability: the backend
      // reports canManage false, and that is the only thing consulted here.
      setup({ community: { canManage: false } });

      expect(card("Datadis")).not.toBeInTheDocument();
      expect(card("Shelly")).not.toBeInTheDocument();
    });
  });

  it("UI-INT-011 lists only the community-scoped integrations, and reads no plant", () => {
    // Huawei is configured per plant, on plant detail (#192). Picking a plant
    // here could only be implicit, which is what UI-INT-005 forbids.
    setup({ community: { canManage: true } });

    expect(card("Datadis")).toBeInTheDocument();
    expect(card("Shelly")).toBeInTheDocument();
    expect(card("Huawei")).not.toBeInTheDocument();
    expect(useGetAllPlants).not.toHaveBeenCalled();
    expect(useGetHuaweiConfig).not.toHaveBeenCalled();
  });

  it("counts only the cards it actually shows", () => {
    setup({ community: { canManage: true } });

    expect(screen.getByText("1 de 2 integraciones activas")).toBeInTheDocument();
  });

  it("offers nothing while the community has not loaded -- not yet known is not 'no'", () => {
    setup({ communityLoading: true });

    expect(card("Datadis")).not.toBeInTheDocument();
    expect(card("Shelly")).not.toBeInTheDocument();
    expect(screen.getByText("Comprobando integraciones…")).toBeInTheDocument();
  });
});

// ── The Datadis form (#245) ─────────────────────────────────────────────────

const cardOf = (name: string) => screen.getByRole("region", { name });
const datadis = () => cardOf("Datadis");
const field = (label: string) => within(datadis()).getByLabelText(label);
const confirmation = () => screen.queryByTestId("modal-panel");

const serveDatadis = (overrides: Partial<Awaited<ReturnType<typeof getDatadisConfig>>> = {}) =>
  vi.mocked(useGetDatadisConfig).mockReturnValue(
    query.success<typeof getDatadisConfig>({
      enabled: true,
      passwordSet: true,
      username: "datadis-user",
      baseUrl: "https://datadis.example",
      ...overrides,
    }),
  );

const failDatadisRead = (status: number) => vi.mocked(useGetDatadisConfig).mockReturnValue(query.error(apiError(status)));

/** Clicks the card's Guardar and, when the form lets it through, confirms. */
async function save(user: ReturnType<typeof userEvent.setup>, card: HTMLElement = datadis()) {
  await user.click(within(card).getByRole("button", { name: "Guardar" }));
  const dialog = confirmation();
  if (dialog) await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
}

const sentDatadis = (call = -1) => mockConfigureDatadis.mock.calls.at(call)?.[0].data;

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field("Usuario"), "datadis-user");
  await user.type(field("URL del servicio"), "https://datadis.es");
}

describe("the Datadis form", () => {
  describe("the password", () => {
    it("UI-INT-001 AC1 with a password stored, saving with the field empty sends no password key", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: true });
      setup({ community: { canManage: true } });

      await save(user);

      await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalledTimes(1));
      expect(sentDatadis()).not.toHaveProperty("password");
      expect(sentDatadis()).toEqual({ enabled: true, username: "datadis-user", baseUrl: "https://datadis.example" });
    });

    it("UI-INT-001 AC2 with a password stored, a typed password is sent", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: true });
      setup({ community: { canManage: true } });

      await user.type(field("Contraseña"), "nueva-clave");
      await save(user);

      await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalledTimes(1));
      expect(sentDatadis()).toHaveProperty("password", "nueva-clave");
    });

    it("UI-INT-003 AC3 with no password stored, an empty field blocks the save with a visible message and sends nothing", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: false });
      setup({ community: { canManage: true } });

      await user.click(within(datadis()).getByRole("button", { name: "Guardar" }));

      expect(field("Contraseña")).toHaveAccessibleDescription("Introduce la contraseña.");
      expect(field("Contraseña")).toBeInvalid();
      expect(confirmation()).not.toBeInTheDocument();
      expect(mockConfigureDatadis).not.toHaveBeenCalled();
    });

    it("UI-INT-003 AC3 a GET 404 (no configuration yet) requires the password too", async () => {
      const user = userEvent.setup();
      failDatadisRead(404);
      setup({ community: { canManage: true } });

      await fillRequired(user);
      await user.click(within(datadis()).getByRole("button", { name: "Guardar" }));

      expect(field("Contraseña")).toHaveAccessibleDescription("Introduce la contraseña.");
      expect(confirmation()).not.toBeInTheDocument();
      expect(mockConfigureDatadis).not.toHaveBeenCalled();
    });

    it("UI-INT-003 a failed read other than 404 offers a retry and no form: nothing about what is stored is known", async () => {
      const user = userEvent.setup();
      failDatadisRead(500);
      setup({ community: { canManage: true } });

      // An edit must send the stored `enabled`, unknown here, so no save is
      // offered at all (#256). Nothing claims whether a password is stored.
      expect(within(datadis()).getByText("No se pudo cargar la configuración de Datadis.")).toBeVisible();
      expect(within(datadis()).queryByLabelText("Usuario")).not.toBeInTheDocument();
      expect(within(datadis()).queryByLabelText("Contraseña")).not.toBeInTheDocument();
      expect(within(datadis()).queryByRole("switch")).not.toBeInTheDocument();
      expect(within(datadis()).queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();

      await user.click(within(datadis()).getByRole("button", { name: "Reintentar" }));

      expect(vi.mocked(useGetDatadisConfig).mock.results.at(-1)?.value.refetch).toHaveBeenCalled();
    });

    it("UI-INT-001 says that an empty field keeps the stored password, as visible text, only when one is stored", () => {
      serveDatadis({ passwordSet: true });
      const { unmount } = setup({ community: { canManage: true } });

      expect(field("Contraseña")).toHaveAccessibleDescription("Contraseña configurada. Déjala vacía para mantenerla.");
      expect(within(datadis()).getByText("Contraseña configurada. Déjala vacía para mantenerla.")).toBeVisible();
      unmount();

      serveDatadis({ passwordSet: false });
      setup({ community: { canManage: true } });

      expect(within(datadis()).queryByText("Contraseña configurada. Déjala vacía para mantenerla.")).not.toBeInTheDocument();
    });

    it("UI-INT-003 shows nothing on first render, and the rule once the field is left", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: false });
      setup({ community: { canManage: true } });

      expect(field("Contraseña")).not.toHaveAccessibleDescription();
      expect(field("Contraseña")).toBeValid();

      await user.click(field("Contraseña"));
      await user.tab();

      expect(field("Contraseña")).toHaveAccessibleDescription("Introduce la contraseña.");
    });

    it("UI-INT-004 AC5 a 400 DATADIS_CONFIG_PASSWORD_REQUIRED lands on the password field, without a generic error", async () => {
      const user = userEvent.setup();
      // The stored configuration says one is stored, the backend finds none:
      // the case of a password already wiped before conluz#404.
      serveDatadis({ passwordSet: true });
      mockConfigureDatadis.mockRejectedValueOnce(apiError(400, { code: "DATADIS_CONFIG_PASSWORD_REQUIRED" }));
      setup({ community: { canManage: true } });

      await save(user);

      await waitFor(() =>
        expect(field("Contraseña")).toHaveAccessibleDescription(
          "No hay ninguna contraseña guardada. Introdúcela para guardar la configuración.",
        ),
      );
      expect(field("Contraseña")).toBeInvalid();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Typing a password is what answers it.
      await user.type(field("Contraseña"), "x");
      expect(field("Contraseña")).toBeValid();
    });

    it("UI-INT-004 any other refusal keeps the generic error", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: true });
      mockConfigureDatadis.mockRejectedValueOnce(apiError(400));
      setup({ community: { canManage: true } });

      await save(user);

      expect(await screen.findByRole("alert")).toHaveTextContent("Error al guardar la configuración");
      expect(field("Contraseña")).toBeValid();
    });

    it("UI-INT-004 empties the field after a successful save, so the next save keeps what was stored", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: false });
      // Stands in for the refetch the save triggers: from the next render on,
      // the stored configuration reports the password as stored.
      mockConfigureDatadis.mockImplementationOnce(async () => {
        serveDatadis({ passwordSet: true });
        return {};
      });
      setup({ community: { canManage: true } });

      await user.type(field("Contraseña"), "nueva-clave");
      await save(user);
      await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalledTimes(1));
      expect(sentDatadis()).toHaveProperty("password", "nueva-clave");
      await waitFor(() => expect(field("Contraseña")).toHaveValue(""));
      expect(field("Contraseña")).toHaveAccessibleDescription("Contraseña configurada. Déjala vacía para mantenerla.");

      await save(user);

      await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalledTimes(2));
      expect(sentDatadis()).not.toHaveProperty("password");
    });

    it("UI-INT-004 a successful save returns the form to its first render, so the emptied field is not flagged before the refetch lands", async () => {
      const user = userEvent.setup();
      // The read keeps saying "none stored": the refetch has not answered yet.
      serveDatadis({ passwordSet: false });
      setup({ community: { canManage: true } });

      await user.click(within(datadis()).getByRole("button", { name: "Guardar" }));
      expect(field("Contraseña")).toHaveAccessibleDescription("Introduce la contraseña.");

      await user.type(field("Contraseña"), "nueva-clave");
      await save(user);

      await waitFor(() => expect(field("Contraseña")).toHaveValue(""));
      expect(field("Contraseña")).not.toHaveAccessibleDescription();
      expect(field("Contraseña")).toBeValid();
    });

    it("UI-INT-002 a blocked save with the switch off shows its message on the field, and sends nothing", async () => {
      const user = userEvent.setup();
      serveDatadis({ enabled: false, passwordSet: false });
      setup({ community: { canManage: true } });

      await user.click(within(datadis()).getByRole("button", { name: "Guardar" }));

      expect(field("Contraseña")).toHaveAccessibleDescription("Introduce la contraseña.");
      expect(confirmation()).not.toBeInTheDocument();
      expect(mockConfigureDatadis).not.toHaveBeenCalled();
    });
  });

  describe("UI-INT-002 the username and the base URL", () => {
    it.each([
      ["an empty username", "Usuario", "", "Introduce el usuario."],
      ["a blank username", "Usuario", "   ", "Introduce el usuario."],
      ["an empty base URL", "URL del servicio", "", "Introduce la URL del servicio."],
      ["a base URL without a scheme", "URL del servicio", "datadis.es", "Introduce una URL válida que empiece por http:// o https://."],
      ["a base URL that is not http(s)", "URL del servicio", "ftp://datadis.es", "Introduce una URL válida que empiece por http:// o https://."],
    ])("UI-INT-002 AC4 %s blocks the save with a message on the field and sends nothing", async (_, label, typed, message) => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: true });
      setup({ community: { canManage: true } });

      await user.clear(field(label));
      if (typed) await user.type(field(label), typed);
      await user.click(within(datadis()).getByRole("button", { name: "Guardar" }));

      expect(field(label)).toHaveAccessibleDescription(message);
      expect(field(label)).toBeInvalid();
      expect(confirmation()).not.toBeInTheDocument();
      expect(mockConfigureDatadis).not.toHaveBeenCalled();
    });

    it("UI-INT-002 shows nothing on first render, and a field's rule once it is left", async () => {
      const user = userEvent.setup();
      failDatadisRead(404);
      setup({ community: { canManage: true } });

      expect(within(datadis()).queryByText("Introduce el usuario.")).not.toBeInTheDocument();
      expect(within(datadis()).queryByText("Introduce la URL del servicio.")).not.toBeInTheDocument();

      await user.click(field("Usuario"));
      await user.tab();

      expect(field("Usuario")).toHaveAccessibleDescription("Introduce el usuario.");
      expect(within(datadis()).queryByText("Introduce la URL del servicio.")).not.toBeInTheDocument();
    });

    it("UI-INT-002 pressing Guardar does not blur the field being edited, so a message cannot move the button from under the click", () => {
      // jsdom has no layout, so the lost click itself cannot happen here: what
      // is asserted is the cause, that the press keeps focus in the field.
      setup({ community: { canManage: true } });

      expect(fireEvent.mouseDown(within(datadis()).getByRole("button", { name: "Guardar" }))).toBe(false);
      // Shelly passes no rules, so its button keeps the default.
      expect(fireEvent.mouseDown(within(cardOf("Shelly")).getByRole("button", { name: "Guardar" }))).toBe(true);
    });

    it("UI-INT-002 lets the save through once every field is fixed", async () => {
      const user = userEvent.setup();
      serveDatadis({ passwordSet: true, baseUrl: "datadis.es" });
      setup({ community: { canManage: true } });

      await user.click(within(datadis()).getByRole("button", { name: "Guardar" }));
      expect(mockConfigureDatadis).not.toHaveBeenCalled();

      await user.clear(field("URL del servicio"));
      await user.type(field("URL del servicio"), "https://datadis.es");
      expect(field("URL del servicio")).toBeValid();
      await save(user);

      await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalledTimes(1));
      expect(sentDatadis()).toHaveProperty("baseUrl", "https://datadis.es");
    });
  });

  it("AC6 the base URL placeholder is the base URL, without the path the backend appends", async () => {
    failDatadisRead(404);
    setup({ community: { canManage: true } });

    expect(field("URL del servicio")).toHaveAttribute("placeholder", "https://datadis.es");
  });
});

describe("the other integrations", () => {
  it("Shelly save body is unchanged by #245", async () => {
    const user = userEvent.setup();
    setup({ community: { canManage: true } });

    await save(user, cardOf("Shelly"));

    await waitFor(() => expect(mockConfigureShelly).toHaveBeenCalledTimes(1));
    expect(mockConfigureShelly.mock.calls[0][0]).toEqual({ communityId: COMMUNITY_ID, data: { enabled: false } });
  });
});
