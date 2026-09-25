import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { buildCoefficient } from "../../test/fixtures";
import dayjs from "dayjs";
import { useGetPartitionCoefficientHistory } from "../../api/supplies/supplies";
import { useSharingAgreementCoefficientMutations } from "./useSharingAgreementCoefficientMutations";

const PLANT_ID = "plant-1";
const AGREEMENT_ID = "agreement-1";
const SUPPLY_ID = "supply-1";
const HISTORY_URL = `/api/v1/supplies/${SUPPLY_ID}/partition-coefficients`;
const COEFFICIENTS_BASE = `/api/v1/plants/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}/partition-coefficients`;

// Mocks only the raw HTTP layer, so the real generated hooks run against a real
// QueryClient and a genuine invalidateQueries-driven refetch is the only thing
// that can move the request counters. Mocking the hooks instead would prove
// nothing about the predicate, which is exactly what is under test here.
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => vi.fn(),
}));
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => vi.fn(),
}));

/**
 * Mounts the history under BOTH key shapes at once: the drawer passes
 * `{ plantId }`, the supply detail section passes nothing, and Orval only
 * appends the params object to the key when it is present. A predicate that
 * matched one and missed the other would leave half the app stale, so both
 * are asserted in the same render.
 */
function Harness({ action }: { action: "reopen" | "activate" | "deactivate" | "close" | "replace" }) {
  useGetPartitionCoefficientHistory(SUPPLY_ID, { plantId: PLANT_ID });
  useGetPartitionCoefficientHistory(SUPPLY_ID);
  const mutations = useSharingAgreementCoefficientMutations(PLANT_ID);

  const run = () => {
    if (action === "reopen") return mutations.reopenCoefficients(AGREEMENT_ID, ["c1"]);
    if (action === "activate") return mutations.activateCoefficients(AGREEMENT_ID, ["c1"], dayjs("2025-06-01"));
    if (action === "deactivate") return mutations.deactivateCoefficients(AGREEMENT_ID, ["c1"]);
    if (action === "close") return mutations.closeCoefficients(AGREEMENT_ID, ["c1"], dayjs("2025-06-01"));
    return mutations.replaceCoefficients(AGREEMENT_ID, [
      { supplyId: SUPPLY_ID, value: 1, coefficient: buildCoefficient(), inputText: "100" },
    ]);
  };

  return (
    <button type="button" onClick={run}>
      Ejecutar
    </button>
  );
}

function renderHarness(action: "reopen" | "activate" | "deactivate" | "close" | "replace") {
  return renderWithProviders(<Harness action={action} />);
}

describe("supply coefficient history — invalidation after coefficient mutations", () => {
  let historyWithPlantCount = 0;
  let historyWithoutPlantCount = 0;

  beforeEach(() => {
    historyWithPlantCount = 0;
    historyWithoutPlantCount = 0;
    mockCustomInstance.mockReset();
    const mutationResponse = () => ({ coefficients: [{ coefficientId: "c1" }] });
    const router = routeRequests([
      {
        method: "GET",
        url: HISTORY_URL,
        respond: (config) => {
          if ((config.params as { plantId?: string } | undefined)?.plantId) historyWithPlantCount += 1;
          else historyWithoutPlantCount += 1;
          return [];
        },
      },
      // replace is a PUT on the collection; the other four are POSTs to a sub-resource.
      { method: "PUT", url: COEFFICIENTS_BASE, respond: mutationResponse },
      {
        method: "POST",
        url: new RegExp(`^${COEFFICIENTS_BASE}/(reopen|activate|deactivate|close)$`),
        respond: mutationResponse,
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
  });

  it.each(["reopen", "activate", "deactivate", "close", "replace"] as const)(
    "refetches both history query keys after %s",
    async (action) => {
      const user = userEvent.setup();
      renderHarness(action);

      // Both keys fetched once on mount.
      await waitFor(() => expect(historyWithPlantCount).toBe(1));
      await waitFor(() => expect(historyWithoutPlantCount).toBe(1));

      await user.click(screen.getByRole("button", { name: "Ejecutar" }));

      // The invalidation refetch is the only thing that can raise these.
      await waitFor(() => expect(historyWithPlantCount).toBe(2));
      await waitFor(() => expect(historyWithoutPlantCount).toBe(2));
    },
  );
});
