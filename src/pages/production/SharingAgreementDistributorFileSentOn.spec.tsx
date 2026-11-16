import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { SharingAgreementResponseStatus, type SharingAgreementResponse } from "../../api/models";
import {
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreement,
  buildSharingAgreementCapabilities,
} from "../../test/fixtures";
import type { SharingAgreementDetailData } from "./useSharingAgreementDetailData";

const mockDetailData = vi.fn();
const mockUpdate = vi.fn();
const mockErrorDispatch = vi.fn();

vi.mock(import("./useSharingAgreementDetailData"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSharingAgreementDetailData: (...args: Parameters<typeof mockDetailData>) => mockDetailData(...args),
}));
// Only the reads and the network calls are replaced; the actions layer runs
// for real, so the bodies asserted below are the ones the page would send.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateSharingAgreement: vi.fn(),
  useGetPlantActivePartitionCoefficients: vi.fn(),
  getSharingAgreementById: vi.fn(),
}));
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => vi.fn() };
});

import {
  getSharingAgreementById,
  useGetPlantActivePartitionCoefficients,
  useUpdateSharingAgreement,
  type getPlantActivePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import { SharingAgreementDetailPage } from "./SharingAgreementDetailPage";

const SENT_ON = "Fecha de envío del fichero a la distribuidora";
const IN_FUTURE = "La fecha de envío no puede ser futura";
const MANAGEABLE = buildSharingAgreementCapabilities({ canRead: true, canManage: true });
const { DRAFT, PUBLISHED, SUPERSEDED } = SharingAgreementResponseStatus;
const STATES = [DRAFT, PUBLISHED, SUPERSEDED] as const;

const PLANT = buildPlant({
  id: "plant-1",
  name: "Planta Luco",
  regulatoryCode: "ES0031300296192001MB",
  capabilities: buildPlantCapabilities({ canRead: true, canListSharingAgreements: true, canManageSharingAgreements: true }),
});

function agreement(overrides: Partial<SharingAgreementResponse> = {}): SharingAgreementResponse {
  return buildSharingAgreement({
    id: "agreement-1",
    plantId: "plant-1",
    name: "Reparto 2025",
    notes: "Nota original",
    nominalPowerKW: 45,
    status: DRAFT,
    distributorFileSentOn: "2026-03-01",
    capabilities: MANAGEABLE,
    ...overrides,
  });
}

function serve(served: SharingAgreementResponse) {
  mockDetailData.mockReturnValue({
    agreement: served,
    plant: PLANT,
    coefficients: [],
    coefficientsData: [],
    isLoading: false,
    isNotFound: false,
    error: null,
  } satisfies SharingAgreementDetailData);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  mockUpdate.mockResolvedValue(undefined);
  vi.mocked(useUpdateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockUpdate }));
  vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
    options?.query?.enabled ? query.success<typeof getPlantActivePartitionCoefficients>([]) : query.disabled(),
  );
  vi.mocked(getSharingAgreementById).mockRejectedValue(new Error("No agreement fixture"));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Only `Date` is faked: the dialog's transitions and userEvent keep their real timers. */
function todayIs(instant: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(instant));
}

function renderDetail() {
  renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId/sharing-agreements/:sharingAgreementId" element={<SharingAgreementDetailPage />} />
    </Routes>,
    { route: "/plants/plant-1/sharing-agreements/agreement-1", activeCommunityId: "TEST-COMMUNITY-ID" },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function openDetails(user: User) {
  await user.click(screen.getByRole("button", { name: /^Ver \d+ datos? más/ }));
  return document.getElementById(
    screen.getByRole("button", { name: "Ocultar detalles" }).getAttribute("aria-controls") as string,
  ) as HTMLElement;
}

async function openEdit(user: User) {
  await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
  await user.click(await screen.findByText("Editar datos del acuerdo"));
  return screen.findByRole("dialog", { name: /^Editar acuerdo de reparto/ });
}

/** The picker's sections: MUI's field exposes the day, month and year as spinbuttons, not one input. */
function sentOnSections(dialog: HTMLElement) {
  const group = within(dialog).getByRole("group", { name: SENT_ON });
  return {
    day: within(group).getByRole("spinbutton", { name: "Dia" }),
    month: within(group).getByRole("spinbutton", { name: "Mes" }),
    year: within(group).getByRole("spinbutton", { name: "Año" }),
  };
}

async function typeSentOn(user: User, dialog: HTMLElement, day: string, month: string, year: string) {
  await user.click(sentOnSections(dialog).day);
  await user.keyboard(day);
  await user.keyboard(month);
  await user.keyboard(year);
}

async function save(user: User, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
}

const sentBody = () => mockUpdate.mock.calls[0][0].data;

describe("UI-AGR-020 the agreement detail shows the distributor file sent date", () => {
  it.each(STATES)("UI-AGR-020 a %s agreement shows the stored date in the long form", async (status) => {
    serve(agreement({ status }));
    const user = userEvent.setup();
    renderDetail();

    const panel = await openDetails(user);

    expect(panel).toHaveTextContent("Fichero enviado a la distribuidora");
    expect(panel).toHaveTextContent("1 de marzo de 2026");
    expect(panel).not.toHaveTextContent("Sin registrar");
  });

  it.each(STATES)("UI-AGR-020 a %s agreement without one says «Sin registrar»", async (status) => {
    serve(agreement({ status, distributorFileSentOn: null }));
    const user = userEvent.setup();
    renderDetail();

    const panel = await openDetails(user);

    expect(panel).toHaveTextContent("Fichero enviado a la distribuidora");
    expect(panel).toHaveTextContent("Sin registrar");
  });
});

describe("UI-AGR-020 the metadata form edits the distributor file sent date in every state", () => {
  beforeEach(() => todayIs("2026-11-16T10:00:00Z"));

  it.each(STATES)("UI-AGR-020 on a %s agreement the field opens with the stored date", async (status) => {
    serve(agreement({ status }));
    const user = userEvent.setup();
    renderDetail();

    const { day, month, year } = sentOnSections(await openEdit(user));

    expect(day).toHaveTextContent("01");
    expect(month).toHaveTextContent("03");
    expect(year).toHaveTextContent("2026");
  });

  it.each(STATES)("UI-AGR-020 on a %s agreement a date can be set where none was recorded", async (status) => {
    serve(agreement({ status, distributorFileSentOn: null }));
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);

    await typeSentOn(user, dialog, "10", "11", "2026");
    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toEqual({
      name: "Reparto 2025",
      notes: "Nota original",
      nominalPowerKW: 45,
      distributorFileSentOn: "2026-11-10",
    });
  });

  it.each(STATES)("UI-AGR-020 on a %s agreement the stored date can be changed", async (status) => {
    serve(agreement({ status }));
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);

    await typeSentOn(user, dialog, "15", "04", "2026");
    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toMatchObject({ distributorFileSentOn: "2026-04-15" });
  });

  it.each(STATES)("UI-AGR-020 on a %s agreement the stored date can be cleared", async (status) => {
    serve(agreement({ status }));
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);

    await user.click(sentOnSections(dialog).day);
    await user.click(within(dialog).getByRole("button", { name: "Limpiar valor" }));
    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toHaveProperty("distributorFileSentOn", null);
  });

  it("UI-AGR-020 a date after today is refused on the field, and nothing is sent", async () => {
    serve(agreement());
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);

    await typeSentOn(user, dialog, "17", "11", "2026");
    await save(user, dialog);

    expect(await within(dialog).findByText(IN_FUTURE)).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /^Editar acuerdo de reparto/ })).toBe(dialog);
  });

  it("UI-AGR-020 «today» is Madrid's: after 23:00 UTC, the next calendar day is already accepted", async () => {
    // 23:30 UTC on the 16th is 00:30 on the 17th in Madrid, where the backend
    // resolves "today".
    todayIs("2026-11-16T23:30:00Z");
    serve(agreement());
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);

    await typeSentOn(user, dialog, "17", "11", "2026");
    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toMatchObject({ distributorFileSentOn: "2026-11-17" });
    expect(within(dialog).queryByText(IN_FUTURE)).not.toBeInTheDocument();
  });

  it("UI-AGR-020 the backend's future-date refusal is said on the field, and the entered values stay", async () => {
    mockUpdate.mockRejectedValue(apiError(400, { code: "SHARING_AGREEMENT_DISTRIBUTOR_FILE_SENT_ON_IN_FUTURE" }));
    serve(agreement());
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);
    const name = within(dialog).getByLabelText(/^Nombre del acuerdo/);
    await user.clear(name);
    await user.type(name, "Reparto 2025 revisado");

    await typeSentOn(user, dialog, "10", "11", "2026");
    await save(user, dialog);

    expect(await within(dialog).findByText(IN_FUTURE)).toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /^Editar acuerdo de reparto/ })).toBe(dialog);
    expect(within(dialog).getByLabelText(/^Nombre del acuerdo/)).toHaveValue("Reparto 2025 revisado");
    const { day, month, year } = sentOnSections(dialog);
    expect(day).toHaveTextContent("10");
    expect(month).toHaveTextContent("11");
    expect(year).toHaveTextContent("2026");
  });

  it("UI-AGR-020 a caller who may not manage the agreement is not offered the edit", async () => {
    serve(agreement({ capabilities: buildSharingAgreementCapabilities({ canRead: true }) }));
    renderDetail();

    // No permitted action, no menu: the edit lives only there.
    expect(screen.queryByRole("button", { name: "Más opciones del acuerdo" })).not.toBeInTheDocument();
    expect(screen.queryByText("Editar datos del acuerdo")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("UI-AGR-021 every update sends the current distributor file sent date", () => {
  it.each(STATES)("UI-AGR-021 on a %s agreement, editing only the name sends the stored date unchanged", async (status) => {
    serve(agreement({ status }));
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);
    const name = within(dialog).getByLabelText(/^Nombre del acuerdo/);

    await user.clear(name);
    await user.type(name, "Reparto 2025 revisado");
    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toEqual({
      name: "Reparto 2025 revisado",
      notes: "Nota original",
      nominalPowerKW: 45,
      distributorFileSentOn: "2026-03-01",
    });
  });

  it("UI-AGR-021 editing only the notes sends the stored date unchanged", async () => {
    serve(agreement());
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);
    const notes = within(dialog).getByLabelText(/^Notas internas/);

    await user.clear(notes);
    await user.type(notes, "Revisado con la distribuidora");
    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toEqual({
      name: "Reparto 2025",
      notes: "Revisado con la distribuidora",
      nominalPowerKW: 45,
      distributorFileSentOn: "2026-03-01",
    });
  });

  it("UI-AGR-021 an agreement without a date sends it as null, never leaves it out", async () => {
    serve(agreement({ distributorFileSentOn: null }));
    const user = userEvent.setup();
    renderDetail();
    const dialog = await openEdit(user);

    await save(user, dialog);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(sentBody()).toHaveProperty("distributorFileSentOn", null);
  });
});
