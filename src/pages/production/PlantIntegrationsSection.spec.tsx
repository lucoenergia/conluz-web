import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { GetHuaweiConfigResponse, PlantCapabilitiesResponse } from "../../api/models";

// The reads, and the three writes whose arguments these tests assert. The
// actions layer runs for real, so the section exists for the reason it exists
// in the app: the plant answered canManage.
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHuaweiConfig: vi.fn(),
  useConfigureHuawei: vi.fn(),
  useEnableHuaweiConfig: vi.fn(),
  useDisableHuaweiConfig: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

import {
  getHuaweiConfig,
  useConfigureHuawei,
  useDisableHuaweiConfig,
  useEnableHuaweiConfig,
  useGetHuaweiConfig,
} from "../../api/production/production";
import { PlantIntegrationsSection } from "./PlantIntegrationsSection";
import {
  DISABLED_TEXT,
  LOAD_FAILED_TEXT,
  NOT_CONFIGURED_TEXT,
  SAVE_FAILED_MESSAGE,
  TOGGLE_FAILED_TEXT,
} from "./huaweiConfig";
import {
  BASE_URL_INVALID_MESSAGE,
  PASSWORD_REQUIRED_MESSAGE,
  USERNAME_REQUIRED_MESSAGE,
} from "../../utils/integrationCredentials";
import { PASSWORD_KEPT_HELPER } from "../integrations/CredentialsFields";

const PLANT_ID = "plant-1";
const STORED_PASSWORD_REFUSAL = "No hay ninguna contraseña guardada. Introdúcela para guardar la configuración.";

const mockConfigure = vi.fn();
const mockEnable = vi.fn();
const mockDisable = vi.fn();

const configured = (overrides: Partial<GetHuaweiConfigResponse> = {}): GetHuaweiConfigResponse => ({
  enabled: true,
  username: "huawei-user",
  baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
  passwordSet: true,
  ...overrides,
});

const serveConfig = (config: GetHuaweiConfigResponse) =>
  vi.mocked(useGetHuaweiConfig).mockReturnValue(query.success<typeof getHuaweiConfig>(config));
const failConfigRead = (status: number) => vi.mocked(useGetHuaweiConfig).mockReturnValue(query.error(apiError(status)));

function setup(capabilities: Partial<PlantCapabilitiesResponse> = { canManage: true }) {
  const plant = buildPlant({
    id: PLANT_ID,
    capabilities: buildPlantCapabilities({ canRead: true, ...capabilities }),
  });
  return renderWithProviders(<PlantIntegrationsSection plant={plant} />);
}

const huaweiCard = () => screen.getByRole("region", { name: "Huawei" });
const theSwitch = () => screen.getByRole("switch", { name: "Integración con Huawei activa" });
const dialog = () => screen.getByRole("dialog");
const field = (label: string) => within(dialog()).getByLabelText(label);
const confirmation = () => screen.getByTestId("modal-panel");

/** The body of the one configuration write, asserted whole. */
const sentBody = () => {
  expect(mockConfigure).toHaveBeenCalledTimes(1);
  expect(mockConfigure.mock.calls[0][0].plantId).toBe(PLANT_ID);
  return mockConfigure.mock.calls[0][0].data;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConfigure.mockResolvedValue(undefined);
  mockEnable.mockResolvedValue(undefined);
  mockDisable.mockResolvedValue(undefined);
  serveConfig(configured());
  vi.mocked(useConfigureHuawei).mockReturnValue(mutation.idle({ mutateAsync: mockConfigure }));
  vi.mocked(useEnableHuaweiConfig).mockReturnValue(mutation.idle({ mutateAsync: mockEnable }));
  vi.mocked(useDisableHuaweiConfig).mockReturnValue(mutation.idle({ mutateAsync: mockDisable }));
});

describe("PlantIntegrationsSection", () => {
  describe("gating", () => {
    it("UI-INT-006 renders the section for a caller the plant says may manage it", () => {
      setup({ canManage: true });

      expect(screen.getByRole("heading", { name: "Integraciones" })).toBeVisible();
      expect(huaweiCard()).toBeVisible();
    });

    it("UI-INT-006 renders nothing, and reads no configuration, when the plant says the caller may not manage it", () => {
      // Every other plant capability granted: only canManage decides.
      const { container } = setup({
        canManage: false,
        canListSharingAgreements: true,
        canManageSharingAgreements: true,
        canReadSupply: true,
      });

      expect(container).toBeEmptyDOMElement();
      expect(useGetHuaweiConfig).not.toHaveBeenCalled();
    });

    it("UI-INT-005 reads the configuration of the plant it is given", () => {
      setup();

      expect(useGetHuaweiConfig).toHaveBeenCalledWith(PLANT_ID, expect.anything());
    });
  });

  describe("reading", () => {
    it("UI-INT-007 shows a 404 as not configured: visible text and Configurar, no switch, no error styling", () => {
      failConfigRead(404);
      setup();

      expect(within(huaweiCard()).getByText(NOT_CONFIGURED_TEXT)).toBeVisible();
      expect(within(huaweiCard()).getByRole("button", { name: "Configurar" })).toBeVisible();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("UI-INT-007 shows any other failed read as an error, with nothing said about the password", () => {
      failConfigRead(500);
      setup();

      expect(within(huaweiCard()).getByRole("alert")).toHaveTextContent(LOAD_FAILED_TEXT);
      expect(screen.queryByText(NOT_CONFIGURED_TEXT)).not.toBeInTheDocument();
      // The password state is unknown: neither stored nor missing is claimed,
      // and no form is offered on a guess.
      expect(screen.queryByText("Guardada")).not.toBeInTheDocument();
      expect(screen.queryByText("Sin guardar")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Configurar|Editar/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });

    it("UI-INT-007 shows a configuration's values, never its password, with Editar", () => {
      setup();

      expect(within(huaweiCard()).getByText("huawei-user")).toBeVisible();
      expect(within(huaweiCard()).getByText("https://eu5.fusionsolar.huawei.com/thirdData")).toBeVisible();
      expect(within(huaweiCard()).getByText("Guardada")).toBeVisible();
      expect(within(huaweiCard()).getByRole("button", { name: "Editar" })).toBeVisible();
    });
  });

  describe("the form, creating", () => {
    beforeEach(() => failConfigRead(404));

    const openCreate = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: "Configurar" }));
      expect(dialog()).toHaveAccessibleName("Configurar integración con Huawei");
    };

    it("UI-INT-008 requires a password, and sends nothing without one", async () => {
      const user = userEvent.setup();
      setup();
      await openCreate(user);

      await user.type(field("Usuario"), "huawei-user");
      await user.type(field("URL del servicio"), "https://eu5.fusionsolar.huawei.com/thirdData");
      await user.click(within(dialog()).getByRole("button", { name: "Guardar" }));

      expect(field("Contraseña")).toHaveAccessibleDescription(PASSWORD_REQUIRED_MESSAGE);
      expect(mockConfigure).not.toHaveBeenCalled();
    });

    it("UI-INT-008 creates the configuration disabled, with no enabled control", async () => {
      const user = userEvent.setup();
      setup();
      await openCreate(user);

      expect(within(dialog()).queryByRole("switch")).not.toBeInTheDocument();
      expect(within(dialog()).queryByRole("checkbox")).not.toBeInTheDocument();

      await user.type(field("Usuario"), "huawei-user");
      await user.type(field("Contraseña"), "s3cret");
      await user.type(field("URL del servicio"), "https://eu5.fusionsolar.huawei.com/thirdData");
      await user.click(within(dialog()).getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mockConfigure).toHaveBeenCalled());
      expect(sentBody()).toEqual({
        enabled: false,
        username: "huawei-user",
        password: "s3cret",
        baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
      });
    });

    it("UI-INT-008 shows no messages before a field is left or a save is attempted", async () => {
      const user = userEvent.setup();
      setup();
      await openCreate(user);

      expect(field("Usuario")).not.toHaveAccessibleDescription(USERNAME_REQUIRED_MESSAGE);
      expect(field("Contraseña")).not.toHaveAccessibleDescription(PASSWORD_REQUIRED_MESSAGE);

      await user.click(field("Usuario"));
      await user.tab();

      expect(field("Usuario")).toHaveAccessibleDescription(USERNAME_REQUIRED_MESSAGE);
    });
  });

  describe("the form, editing", () => {
    const openEdit = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: "Editar" }));
      expect(dialog()).toHaveAccessibleName("Editar integración con Huawei");
    };
    const save = (user: ReturnType<typeof userEvent.setup>) =>
      user.click(within(dialog()).getByRole("button", { name: "Guardar" }));

    it("UI-INT-008 omits the password key when the field is left empty, and sends the stored enabled", async () => {
      const user = userEvent.setup();
      setup();
      await openEdit(user);
      await save(user);

      await waitFor(() => expect(mockConfigure).toHaveBeenCalled());
      expect(sentBody()).toEqual({
        enabled: true,
        username: "huawei-user",
        baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
      });
      expect(sentBody()).not.toHaveProperty("password");
    });

    it("UI-INT-008 leaves a disabled configuration disabled on edit", async () => {
      const user = userEvent.setup();
      serveConfig(configured({ enabled: false }));
      setup();
      await openEdit(user);
      await save(user);

      await waitFor(() => expect(mockConfigure).toHaveBeenCalled());
      expect(sentBody()).toHaveProperty("enabled", false);
    });

    it("UI-INT-008 says an empty field keeps the stored password, only when one is stored", async () => {
      const user = userEvent.setup();
      setup();
      await openEdit(user);

      expect(field("Contraseña")).toHaveAccessibleDescription(PASSWORD_KEPT_HELPER);
      expect(within(dialog()).getByText(PASSWORD_KEPT_HELPER)).toBeVisible();
    });

    it("UI-INT-008 shows no keep-the-password helper when no password is stored", async () => {
      const user = userEvent.setup();
      serveConfig(configured({ passwordSet: false }));
      setup();
      await openEdit(user);

      expect(within(dialog()).queryByText(PASSWORD_KEPT_HELPER)).not.toBeInTheDocument();
    });

    it("UI-INT-008 sends a typed password, and the field is empty when the form opens again", async () => {
      const user = userEvent.setup();
      setup();
      await openEdit(user);
      await user.type(field("Contraseña"), "n3w-secret");
      await save(user);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(sentBody()).toHaveProperty("password", "n3w-secret");

      await openEdit(user);
      expect(field("Contraseña")).toHaveValue("");
    });

    it("UI-INT-008 blocks the save on a blank username or a URL that is not absolute http(s)", async () => {
      const user = userEvent.setup();
      setup();
      await openEdit(user);
      await user.clear(field("Usuario"));
      await user.clear(field("URL del servicio"));
      await user.type(field("URL del servicio"), "eu5.fusionsolar.huawei.com");
      await save(user);

      expect(field("Usuario")).toHaveAccessibleDescription(USERNAME_REQUIRED_MESSAGE);
      expect(field("URL del servicio")).toHaveAccessibleDescription(BASE_URL_INVALID_MESSAGE);
      expect(mockConfigure).not.toHaveBeenCalled();
    });

    it("UI-INT-008 shows HUAWEI_CONFIG_PASSWORD_REQUIRED on the password field, without the generic error", async () => {
      const user = userEvent.setup();
      mockConfigure.mockRejectedValue(apiError(400, { code: "HUAWEI_CONFIG_PASSWORD_REQUIRED" }));
      setup();
      await openEdit(user);
      await save(user);

      await waitFor(() => expect(field("Contraseña")).toHaveAccessibleDescription(STORED_PASSWORD_REFUSAL));
      expect(within(dialog()).queryByText(SAVE_FAILED_MESSAGE)).not.toBeInTheDocument();
    });

    it("UI-INT-008 keeps the generic error for any other refusal", async () => {
      const user = userEvent.setup();
      mockConfigure.mockRejectedValue(apiError(500));
      setup();
      await openEdit(user);
      await save(user);

      expect(await within(dialog()).findByText(SAVE_FAILED_MESSAGE)).toBeVisible();
      expect(field("Contraseña")).not.toHaveAccessibleDescription(STORED_PASSWORD_REFUSAL);
    });
  });

  describe("the switch", () => {
    it("UI-INT-009 reflects the stored enabled", () => {
      setup();
      expect(theSwitch()).toBeChecked();
    });

    it("UI-INT-009 turning it off calls disable, never enable or the configuration write", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(theSwitch());
      expect(confirmation()).toHaveTextContent("Desactivar integración con Huawei");
      await user.click(within(confirmation()).getByRole("button", { name: "Desactivar" }));

      await waitFor(() => expect(mockDisable).toHaveBeenCalledWith({ plantId: PLANT_ID }));
      expect(mockEnable).not.toHaveBeenCalled();
      expect(mockConfigure).not.toHaveBeenCalled();
    });

    it("UI-INT-009 turning it on calls enable, never disable or the configuration write", async () => {
      const user = userEvent.setup();
      serveConfig(configured({ enabled: false }));
      setup();

      expect(theSwitch()).not.toBeChecked();
      await user.click(theSwitch());
      await user.click(within(confirmation()).getByRole("button", { name: "Activar" }));

      await waitFor(() => expect(mockEnable).toHaveBeenCalledWith({ plantId: PLANT_ID }));
      expect(mockDisable).not.toHaveBeenCalled();
      expect(mockConfigure).not.toHaveBeenCalled();
    });

    it("UI-INT-009 a cancelled confirmation writes nothing", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(theSwitch());
      await user.click(within(confirmation()).getByRole("button", { name: "Cancelar" }));

      expect(mockDisable).not.toHaveBeenCalled();
      expect(theSwitch()).toBeChecked();
    });

    it("UI-INT-009 says so with visible text while the configuration is disabled", () => {
      serveConfig(configured({ enabled: false }));
      setup();

      expect(within(huaweiCard()).getByText(DISABLED_TEXT)).toBeVisible();
    });

    it("UI-INT-009 shows no disabled text while the configuration is enabled", () => {
      setup();

      expect(screen.queryByText(DISABLED_TEXT)).not.toBeInTheDocument();
    });

    it("UI-INT-009 cannot be flipped again while a write is in flight", async () => {
      const user = userEvent.setup();
      // Never settles, so the write stays in flight for the rest of the test.
      mockDisable.mockReturnValue(new Promise(() => {}));
      setup();

      await user.click(theSwitch());
      await user.click(within(confirmation()).getByRole("button", { name: "Desactivar" }));

      // The confirmation stays open while the write runs, so the page behind it
      // is aria-hidden: hence `hidden` to reach the switch.
      const confirm = within(confirmation()).getByRole("button", { name: "Desactivar" });
      await waitFor(() => expect(confirm).toBeDisabled());
      expect(screen.getByRole("switch", { name: "Integración con Huawei activa", hidden: true })).toBeDisabled();
      await user.click(confirm);
      expect(mockDisable).toHaveBeenCalledTimes(1);
    });

    it("UI-INT-009 is disabled while the actions layer reports the write pending", () => {
      vi.mocked(useDisableHuaweiConfig).mockReturnValue(mutation.pending({ plantId: PLANT_ID }));
      setup();

      expect(theSwitch()).toBeDisabled();
    });

    it("UI-INT-009 raises the generic error feedback for a refusal with no message of its own", async () => {
      const user = userEvent.setup();
      mockDisable.mockRejectedValue(apiError(500));
      setup();

      await user.click(theSwitch());
      await user.click(within(confirmation()).getByRole("button", { name: "Desactivar" }));

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(TOGGLE_FAILED_TEXT));
      expect(theSwitch()).toBeChecked();
    });

    describe("a refused enable (409 HUAWEI_CONFIG_INCOMPLETE)", () => {
      const refuseEnable = async (missingFields: string) => {
        mockEnable.mockRejectedValue(apiError(409, { code: "HUAWEI_CONFIG_INCOMPLETE", params: { missingFields } }));
        serveConfig(configured({ enabled: false, passwordSet: false }));
        const user = userEvent.setup();
        setup();
        await user.click(theSwitch());
        await user.click(within(confirmation()).getByRole("button", { name: "Activar" }));
        return user;
      };

      it("UI-INT-010 leaves the switch off and lists the missing fields in Spanish", async () => {
        await refuseEnable("username,password");

        expect(
          await within(huaweiCard()).findByText("Faltan datos para activar la integración: usuario y contraseña."),
        ).toBeVisible();
        expect(theSwitch()).not.toBeChecked();
        expect(mockErrorDispatch).not.toHaveBeenCalled();
      });

      it("UI-INT-010 names the base URL as URL del servicio", async () => {
        await refuseEnable("username,baseUrl,password");

        expect(
          await within(huaweiCard()).findByText(
            "Faltan datos para activar la integración: usuario, URL del servicio y contraseña.",
          ),
        ).toBeVisible();
      });

      it("UI-INT-010 offers an action that opens the edit form", async () => {
        const user = await refuseEnable("password");

        await user.click(await within(huaweiCard()).findByRole("button", { name: "Completar configuración" }));

        expect(dialog()).toHaveAccessibleName("Editar integración con Huawei");
      });
    });
  });
});
