import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { apiError } from "../../test/apiError";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildPlant,
  buildPlantCapabilities,
  buildSupply,
  buildSupplyCapabilities,
  buildSupplyReference,
} from "../../test/fixtures";
import type { PlantResponse } from "../../api/models";

// Reads stubbed, the mutations left real but for their network call: the gates
// live in the action hooks, so replacing those would restate them.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
  useUpdatePlant: vi.fn(),
}));
vi.mock(import("./usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { useCreatePlant, useUpdatePlant } from "../../api/plants/plants";
import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import { PlantFormDialog } from "./PlantFormDialog";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";
const POWER_ERROR = "Por favor, introduce un número mayor que 0";
const CIL_FORMAT = "El CIL debe tener 25 letras o números.";
const CIL_IN_USE = "Ya hay otra planta con este CIL.";
const CIL = "ES0031405000000001AB1F001";
const NBSP = "\u00A0";
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const onClose = vi.fn();

const PLANT: PlantResponse = buildPlant({
  id: PLANT_ID,
  name: "Planta Norte",
  providerCode: "NE=1",
  regulatoryCode: "CAU-1",
  cil: CIL,
  address: "Calle Sol 1",
  peakPowerKWp: 80,
  nominalPowerKW: 60,
  supply: buildSupplyReference({ id: "supply-1", code: "ES0001" }),
  community: { id: COMMUNITY_ID },
  capabilities: buildPlantCapabilities({ canRead: true, canManage: true }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue(buildPlant());
  mockUpdate.mockResolvedValue(PLANT);
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        name: "Sol Común",
        capabilities: buildCommunityCapabilities({ canRead: true, canCreatePlants: true }),
      }),
    ),
  );
  const supplies = [
    buildSupply({
      id: "supply-1",
      code: "ES0001",
      name: "Casa Norte",
      community: { id: COMMUNITY_ID, name: "Sol Común" },
      capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant: true }),
    }),
  ];
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({ items: supplies, size: 10000, totalElements: 1, totalPages: 1, number: 0 }),
  );
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync: mockCreate }));
  vi.mocked(useUpdatePlant).mockReturnValue(mutation.idle({ mutateAsync: mockUpdate }));
});

const renderCreate = () =>
  renderWithProviders(<PlantFormDialog target={{ kind: "create" }} onClose={onClose} />, { activeCommunityId: COMMUNITY_ID });

function renderEdit(plant: PlantResponse = PLANT) {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({ plant, isLoading: false, isNotFound: false, error: null, refetch: vi.fn() });
  return renderWithProviders(<PlantFormDialog target={{ kind: "edit", plantId: PLANT_ID }} onClose={onClose} />, {
    activeCommunityId: COMMUNITY_ID,
  });
}

const peak = () => screen.getByLabelText(/^Potencia pico/);
const nominal = () => screen.getByLabelText(/^Potencia nominal/);
const cil = () => screen.getByRole("textbox", { name: "CIL" });
const create = () => screen.getByRole("button", { name: "Crear planta" });
const save = () => screen.getByRole("button", { name: "Guardar" });

type User = ReturnType<typeof userEvent.setup>;

/** Every required input of the create form, with values the backend accepts. */
async function fillCreate(user: User, powers: { peak: string; nominal: string } = { peak: "80", nominal: "60" }) {
  await user.type(screen.getByLabelText(/Código de proveedor/), "NE=9");
  await user.type(screen.getByLabelText(/^Nombre/), "Planta Oeste");
  await user.click(screen.getByRole("combobox", { name: /Punto de suministro/ }));
  await user.click(await screen.findByRole("option", { name: /ES0001/ }));
  await user.type(screen.getByLabelText(/Dirección/), "Calle Luna 3");
  // An empty power is left untyped.
  if (powers.peak) await user.type(peak(), powers.peak);
  if (powers.nominal) await user.type(nominal(), powers.nominal);
}

/** Pasted, so a no-break space arrives as it would from a document. */
async function pasteCil(user: User, value: string) {
  await user.clear(cil());
  await user.click(cil());
  await user.paste(value);
}

const sentData = (mock: typeof mockCreate) => mock.mock.calls[0][0].data;

describe("UI-PLS-005 the peak and nominal power (#407)", () => {
  it.each([
    ["empty", ""],
    ["0", "0"],
    ["negative", "-5"],
  ])("UI-PLS-005 with both powers %s sends nothing, says so on each, and focuses the peak power", async (_, value) => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user, { peak: value, nominal: value });

    await user.click(create());

    expect(mockCreate).not.toHaveBeenCalled();
    expect(peak()).toHaveAccessibleDescription(POWER_ERROR);
    expect(nominal()).toHaveAccessibleDescription(POWER_ERROR);
    expect(peak()).toHaveFocus();
    expect(screen.getByRole("dialog", { name: /^Crear planta en/ })).toBeInTheDocument();
  });

  it("UI-PLS-005 with only the nominal power at 0 says so on it alone, and focuses it", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user, { peak: "80", nominal: "0" });

    await user.click(create());

    expect(mockCreate).not.toHaveBeenCalled();
    expect(peak()).not.toHaveAccessibleDescription(POWER_ERROR);
    expect(nominal()).toHaveAccessibleDescription(POWER_ERROR);
    expect(nominal()).toHaveFocus();
  });

  it("UI-PLS-005 sends a nominal power above the peak power: the form never compares them", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user, { peak: "60", nominal: "80" });

    await user.click(create());

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(sentData(mockCreate)).toMatchObject({ peakPowerKWp: 60, nominalPowerKW: 80 });
  });
});

describe("UI-PLS-009 the CIL is sent as the backend stores it (#407)", () => {
  it("UI-PLS-009 sends a CIL typed in lower case with spaces upper-cased and without them", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await user.type(cil(), "es00 3140 5000 0000 01ab 1f00 1");

    await user.click(create());

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(sentData(mockCreate).cil).toBe(CIL);
  });

  it("UI-PLS-009 removes no-break spaces inside the CIL and at both ends", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await pasteCil(user, `${NBSP}${CIL.slice(0, 12)}${NBSP}${CIL.slice(12)}${NBSP}`);

    await user.click(create());

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(sentData(mockCreate).cil).toBe(CIL);
  });

  it("UI-PLS-009 sends an empty CIL as absent", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await pasteCil(user, `  ${NBSP}`);

    await user.click(create());

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(sentData(mockCreate).cil).toBeUndefined();
  });

  it("UI-PLS-009 on an edit, a cleared CIL is sent absent, which clears the stored one", async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.clear(cil());
    await user.click(save());

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].plantId).toBe(PLANT_ID);
    expect(sentData(mockUpdate).cil).toBeUndefined();
  });

  it("UI-PLS-009 on an edit left untouched, the stored CIL is sent back as it is", async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.click(save());

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentData(mockUpdate).cil).toBe(CIL);
  });
});

describe("UI-PLS-005 a CIL the form refuses (#407)", () => {
  it.each([
    ["24 characters", CIL.slice(0, 24)],
    ["26 characters", `${CIL}0`],
    ["ß, whose upper case is two ASCII letters", `${CIL.slice(0, 23)}ß`],
    ["Ñ", `${CIL.slice(0, 24)}Ñ`],
  ])("UI-PLS-005 with %s sends nothing and says so on the CIL", async (_, value) => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await pasteCil(user, value);

    await user.click(create());

    expect(mockCreate).not.toHaveBeenCalled();
    expect(cil()).toHaveAccessibleDescription(CIL_FORMAT);
    expect(cil()).toHaveFocus();
    expect(cil()).toHaveValue(value);
  });

  it("UI-PLS-005 focuses the CIL before an empty name: it comes first in the form", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await pasteCil(user, "ES123");
    await user.clear(screen.getByLabelText(/^Nombre/));

    await user.click(create());

    expect(mockCreate).not.toHaveBeenCalled();
    expect(cil()).toHaveFocus();
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });
});

describe("UI-PLS-010 a CIL the backend refuses is said on the CIL input (#407)", () => {
  it.each([
    [409, "PLANT_CIL_ALREADY_IN_USE", CIL_IN_USE],
    [400, "PLANT_CIL_INVALID", CIL_FORMAT],
  ] as const)("UI-PLS-010 on a create, a %i %s keeps the form open with its values", async (status, code, message) => {
    mockCreate.mockRejectedValue(apiError(status, { code }));
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await user.type(cil(), CIL);

    await user.click(create());

    await waitFor(() => expect(cil()).toHaveAccessibleDescription(message));
    await waitFor(() => expect(cil()).toHaveFocus());
    expect(cil()).toHaveValue(CIL);
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Planta Oeste");
    expect(peak()).toHaveValue(80);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it.each([
    [409, "PLANT_CIL_ALREADY_IN_USE", CIL_IN_USE],
    [400, "PLANT_CIL_INVALID", CIL_FORMAT],
  ] as const)("UI-PLS-010 on an edit, a %i %s keeps the form open with its values", async (status, code, message) => {
    mockUpdate.mockRejectedValue(apiError(status, { code }));
    const user = userEvent.setup();
    renderEdit();
    await pasteCil(user, "ES0031405000000001AB1F002");

    await user.click(save());

    await waitFor(() => expect(cil()).toHaveAccessibleDescription(message));
    expect(cil()).toHaveValue("ES0031405000000001AB1F002");
    expect(screen.getByRole("dialog", { name: "Editar planta" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("UI-PLS-010 a typed CIL clears what the refusal said", async () => {
    mockCreate.mockRejectedValueOnce(apiError(409, { code: "PLANT_CIL_ALREADY_IN_USE" }));
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await user.type(cil(), CIL);
    await user.click(create());
    await waitFor(() => expect(cil()).toHaveAccessibleDescription(CIL_IN_USE));

    await user.type(cil(), "{Backspace}2");

    expect(cil()).not.toHaveAccessibleDescription(CIL_IN_USE);
  });

  it("UI-ERR-005 a refusal about something else still goes to the page, not the CIL", async () => {
    mockCreate.mockRejectedValue(apiError(409, { code: "SUPPLY_ALREADY_HAS_PLANT" }));
    const user = userEvent.setup();
    renderCreate();
    await fillCreate(user);
    await user.type(cil(), CIL);

    await user.click(create());

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith("Este punto de suministro ya pertenece a otra planta."));
    expect(cil()).not.toHaveAccessibleDescription();
  });
});

describe("UI-PLS-004 the edit form opens with the plant's powers and CIL (#407)", () => {
  it("UI-PLS-004 fills peak power, nominal power and CIL with the plant's current values", () => {
    renderEdit();

    expect(peak()).toHaveValue(80);
    expect(nominal()).toHaveValue(60);
    expect(cil()).toHaveValue(CIL);
  });

  it("UI-PLS-004 leaves the CIL empty for a plant without one", () => {
    renderEdit({ ...PLANT, cil: null });

    expect(cil()).toHaveValue("");
  });
});
