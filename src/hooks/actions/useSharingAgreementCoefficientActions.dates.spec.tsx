import { describe, expect, it, vi, beforeEach } from "vitest";
import type { QueryKey } from "@tanstack/react-query";
import dayjs from "dayjs";
import { createTestQueryClient, renderHookWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { buildSharingAgreement, buildSharingAgreementCapabilities } from "../../test/fixtures";
import type { CoefficientDatesEffectsResponse } from "../../api/models";
import {
  useActivatePartitionCoefficients,
  usePreviewPartitionCoefficientDates,
  useSetPartitionCoefficientDates,
} from "../../api/sharing-agreements/sharing-agreements";
import { useSharingAgreementCoefficientActions, type CoefficientDatesRequest } from "./useSharingAgreementCoefficientActions";

// The real module is kept for its query-key getters; only the mutation hooks are replaced.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useActivatePartitionCoefficients: vi.fn(),
  usePreviewPartitionCoefficientDates: vi.fn(),
  useSetPartitionCoefficientDates: vi.fn(),
}));

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";

const MANAGEABLE = buildSharingAgreement({
  id: "agreement-1",
  plantId: PLANT_ID,
  capabilities: buildSharingAgreementCapabilities({ canRead: true, canManage: true }),
});
const READ_ONLY = buildSharingAgreement({
  id: "agreement-1",
  plantId: PLANT_ID,
  capabilities: buildSharingAgreementCapabilities({ canRead: true }),
});

const EFFECTS: CoefficientDatesEffectsResponse = {
  coefficients: [],
  neighbours: [],
  leavingClosures: [],
  agreementStatuses: [],
  communityStart: { before: null, after: null },
};

const REQUEST: CoefficientDatesRequest = {
  coefficients: [
    { coefficientId: "c1", validFrom: dayjs("2025-03-01") },
    { coefficientId: "c2", validFrom: dayjs("2025-02-14") },
  ],
  leavingClosures: [{ supplyId: "s-bar", closedOn: dayjs("2025-04-01") }],
};

const previewAsync = vi.fn();
const setAsync = vi.fn();
const activateAsync = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  previewAsync.mockResolvedValue(EFFECTS);
  setAsync.mockResolvedValue(EFFECTS);
  activateAsync.mockResolvedValue({ coefficients: [], leavingClosures: [] });
  vi.mocked(usePreviewPartitionCoefficientDates).mockReturnValue(mutation.idle({ mutateAsync: previewAsync }));
  vi.mocked(useSetPartitionCoefficientDates).mockReturnValue(mutation.idle({ mutateAsync: setAsync }));
  vi.mocked(useActivatePartitionCoefficients).mockReturnValue(mutation.idle({ mutateAsync: activateAsync }));
});

function renderActions(agreement = MANAGEABLE) {
  const queryClient = createTestQueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const rendered = renderHookWithProviders(() => useSharingAgreementCoefficientActions(PLANT_ID).forAgreement(agreement), {
    queryClient,
    activeCommunityId: COMMUNITY_ID,
  });
  /** Whether the invalidations made so far reach a query with this key. */
  const invalidates = (key: string) =>
    invalidateSpy.mock.calls.some(([filters]) => {
      const predicate = filters && "predicate" in filters ? filters.predicate : undefined;
      const queryKey: QueryKey = [key];
      return predicate?.(queryClient.getQueryCache().build(queryClient, { queryKey })) ?? false;
    });
  return { ...rendered, invalidateSpy, invalidates };
}

/** Every read Scope 7 of #419 names, in this plant and community. */
const DATED_READS = [
  // This agreement, another of the plant, and their coefficients.
  `/api/v1/plants/${PLANT_ID}/sharing-agreements/agreement-1`,
  `/api/v1/plants/${PLANT_ID}/sharing-agreements/agreement-1/partition-coefficients`,
  `/api/v1/plants/${PLANT_ID}/sharing-agreements/initial`,
  `/api/v1/plants/${PLANT_ID}/sharing-agreements/initial/partition-coefficients`,
  // The plant's active coefficients.
  `/api/v1/plants/${PLANT_ID}/partition-coefficients/active`,
  // Observed sharing, of the plant and of an agreement.
  `/api/v1/plants/${PLANT_ID}/sharing-agreements/observation`,
  `/api/v1/plants/${PLANT_ID}/sharing-agreements/agreement-1/observation`,
  // What depends on the community start date: every member's payback and the community's metrics.
  `/api/v1/communities/${COMMUNITY_ID}/memberships/user-1/payback`,
  `/api/v1/communities/${COMMUNITY_ID}/memberships/user-2/payback`,
  `/api/v1/communities/${COMMUNITY_ID}/energy-metrics`,
];

describe("useSharingAgreementCoefficientActions — dates", () => {
  it("hands out neither dates action to a caller the agreement does not let manage it", () => {
    const { result } = renderActions(READ_ONLY);

    expect(result.current.actions.previewDates).toBeUndefined();
    expect(result.current.actions.setDates).toBeUndefined();
    expect(result.current.outcomes.setDates.state).toBe("denied");
  });

  it("UI-AGR-034: sends each date as the local day, YYYY-MM-DD, and the listed closures", async () => {
    const { result } = renderActions();

    await result.current.actions.previewDates!.run(REQUEST);

    expect(previewAsync).toHaveBeenCalledWith({
      plantId: PLANT_ID,
      sharingAgreementId: "agreement-1",
      data: {
        coefficients: [
          { coefficientId: "c1", validFrom: "2025-03-01" },
          { coefficientId: "c2", validFrom: "2025-02-14" },
        ],
        leavingClosures: [{ supplyId: "s-bar", closedOn: "2025-04-01" }],
      },
    });
  });

  it("UI-AGR-034: a dry run returns its effects and invalidates nothing", async () => {
    const { result, invalidateSpy } = renderActions();

    expect(await result.current.actions.previewDates!.run(REQUEST)).toEqual({ kind: "applied", effects: EFFECTS });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("UI-AGR-035: a write returns the effects as written and invalidates every read that depends on them", async () => {
    const written = { ...EFFECTS, communityStart: { before: "2025-03-14T23:00:00Z", after: "2025-02-28T23:00:00Z" } };
    setAsync.mockResolvedValue(written);
    const { result, invalidates } = renderActions();

    expect(await result.current.actions.setDates!.run(REQUEST)).toEqual({ kind: "applied", effects: written });
    for (const key of DATED_READS) expect(invalidates(key), key).toBe(true);
  });

  it("UI-AGR-035: the invalidation stays in this plant and this community", async () => {
    const { result, invalidates } = renderActions();

    await result.current.actions.setDates!.run(REQUEST);

    expect(invalidates("/api/v1/plants/plant-2/sharing-agreements/agreement-9")).toBe(false);
    expect(invalidates("/api/v1/communities/community-b/memberships/user-1/payback")).toBe(false);
    expect(invalidates(`/api/v1/communities/${COMMUNITY_ID}/supplies`)).toBe(false);
  });

  it("UI-AGR-035: an activation invalidates the same reads, the community start date's included", async () => {
    const { result, invalidates } = renderActions();

    await result.current.actions.activate!.run(["c1"], dayjs("2025-03-01"));

    for (const key of DATED_READS) expect(invalidates(key), key).toBe(true);
  });

  it("UI-AGR-036: a 409 is refused, each detail on the row its params name, and nothing is invalidated", async () => {
    setAsync.mockRejectedValue(
      Object.assign(apiError(409), {
        response: {
          status: 409,
          headers: {},
          data: {
            status: 409,
            errors: [
              { code: "SHARING_AGREEMENT_DATE_IN_FUTURE", message: "raw", params: { coefficientId: "c1", cups: "ES1" } },
              { code: "SHARING_AGREEMENT_LEAVING_SUPPLY_IN_AGREEMENT", message: "raw", params: { supplyId: "s-bar", cups: "ES9" } },
            ],
          },
        },
      }),
    );
    const { result, invalidateSpy } = renderActions();

    expect(await result.current.actions.setDates!.run(REQUEST)).toEqual({
      kind: "refused",
      rows: [
        { coefficientId: "c1", supplyId: undefined, message: "La fecha indicada no puede ser una fecha futura (afecta a ES1)." },
        {
          coefficientId: undefined,
          supplyId: "s-bar",
          message: "Este punto tiene un coeficiente en este acuerdo, así que no sale del reparto (afecta a ES9).",
        },
      ],
      general: [],
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("a 400 is refused with the fallback sentence, never the server's own message", async () => {
    previewAsync.mockRejectedValue(apiError(400, { message: "Coefficient listed twice" }));
    const { result } = renderActions();

    expect(await result.current.actions.previewDates!.run(REQUEST)).toEqual({
      kind: "refused",
      rows: [],
      general: ["No se han podido comprobar las fechas. Revísalas y vuelve a intentarlo."],
    });
  });

  it("a network failure or a 5xx is a failure, not a refusal", async () => {
    setAsync.mockRejectedValueOnce(new Error("Network Error")).mockRejectedValueOnce(apiError(503));
    const { result } = renderActions();

    expect(await result.current.actions.setDates!.run(REQUEST)).toEqual({ kind: "failed" });
    expect(await result.current.actions.setDates!.run(REQUEST)).toEqual({ kind: "failed" });
  });
});
