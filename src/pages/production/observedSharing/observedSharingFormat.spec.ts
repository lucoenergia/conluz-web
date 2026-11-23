import { describe, expect, test } from "vitest";
import { buildObservationSummary } from "../../../test/fixtures";
import {
  betaMatches,
  formatAgreementApplication,
  formatAnomalyDetail,
  formatAnomalyEnd,
  formatBeta,
  formatDataRange,
  formatDataRangeInSentence,
  formatObservedDate,
  formatRegisteredPeriod,
  unattributedRemainder,
} from "./observedSharingFormat";

// Intl writes a no-break space between the figure and the percent sign.
const percent = (text: string) => text.replace(" %", "\u00a0%");

describe("observed sharing formatting", () => {
  test("UI-AGR-025: a data range is written in words", () => {
    expect(formatDataRange("2023-04-01", "2026-10-31")).toBe("Del 1 abr 2023 al 31 oct 2026");
    expect(formatDataRangeInSentence("2023-04-01", "2026-10-31")).toBe("del 1 abr 2023 al 31 oct 2026");
  });

  test("UI-AGR-025: a registered period ends on its exclusive end, is in progress while open, and has no date before it starts", () => {
    expect(formatRegisteredPeriod("2025-03-01", "2026-01-01")).toBe("01/03/2025 – 01/01/2026");
    expect(formatRegisteredPeriod("2025-03-01", null)).toBe("01/03/2025 – en curso");
    expect(formatRegisteredPeriod(null, null)).toBe("Sin fecha");
  });

  test("UI-AGR-025: an observed date is one day when known, a range when not, and 'o antes' when the data starts on it", () => {
    expect(formatObservedDate({ from: "2025-03-01", to: "2025-03-01" })).toBe("01/03/2025");
    expect(formatObservedDate({ from: "2025-02-26", to: "2025-03-04" })).toBe("Entre el 26/02/2025 y el 04/03/2025");
    expect(formatObservedDate({ from: null, to: "2023-04-01" })).toBe("01/04/2023 o antes");
  });

  test("UI-AGR-025: an anomaly lasting to the end of the data is 'en curso'", () => {
    expect(formatAnomalyEnd(null)).toBe("en curso");
    expect(formatAnomalyEnd("2025-06-30")).toBe("30/06/2025");
  });

  test("UI-AGR-026: a β is a percentage with 4 decimals, and '—' when the analysis gave none", () => {
    expect(formatBeta(0.0315)).toBe(percent("3,1500 %"));
    expect(formatBeta(0.041234)).toBe(percent("4,1234 %"));
    expect(formatBeta(null)).toBe("—");
  });

  test("UI-AGR-026: an observed β within ±0.1 percentage points of the registered one counts as equal", () => {
    expect(betaMatches(0.0315, 0.0315)).toBe(true);
    expect(betaMatches(0.0325, 0.0315)).toBe(true);
    expect(betaMatches(0.0305, 0.0315)).toBe(true);
    expect(betaMatches(0.032501, 0.0315)).toBe(false);
    expect(betaMatches(0.030499, 0.0315)).toBe(false);
  });

  test("UI-AGR-024: an anomaly's detail is its observed β and the measurable days it rests on", () => {
    expect(formatAnomalyDetail(0.0412, 21)).toBe(percent("β observada 4,1200 % en 21 días medibles."));
    expect(formatAnomalyDetail(0.0412, 1)).toBe(percent("β observada 4,1200 % en 1 día medible."));
  });

  test("UI-AGR-023: an agreement's application reads its most frequent observed date, or why there is none", () => {
    const application = (overrides: Parameters<typeof buildObservationSummary>[0]) =>
      formatAgreementApplication(buildObservationSummary(overrides));

    expect(application({ mostFrequentObservedDate: { from: "2025-03-01", to: "2025-03-01" } })).toBe(
      "Aplicado desde 01/03/2025",
    );
    expect(application({ mostFrequentObservedDate: { from: null, to: "2023-04-01" } })).toBe(
      "Aplicado el 01/04/2023 o antes",
    );
    expect(application({ mostFrequentObservedDate: { from: "2025-02-26", to: "2025-03-04" } })).toBe(
      "Entre el 26/02/2025 y el 04/03/2025",
    );
    expect(application({ distributorFileSentOn: "2026-10-15" })).toBe("Pendiente de aplicar · enviado el 15/10/2026");
    expect(application({})).toBe("Sin observar");
  });
});

describe("the unattributed production's rest", () => {
  const rest = (unallocated: number, registeredShareWithoutData: number) =>
    unattributedRemainder({ days: 422, unallocated, registeredShareWithoutData });

  test("UI-AGR-041: 3,03 % with 4,37 % of supplies without data leaves −1,3 points: the supplies with data received more", () => {
    expect(rest(0.0303, 0.0437)).toEqual({ text: "-1,3 pp", kind: "receivedMore" });
  });

  test("UI-AGR-041: a positive rest beyond 0,1 points is production that reached no registered supply, with its sign", () => {
    expect(rest(0.0574, 0)).toEqual({ text: "+5,7 pp", kind: "notDelivered" });
  });

  test("UI-AGR-041: ±0,1 points is rounding, its edges included, and one millionth beyond is not", () => {
    expect(rest(0.031, 0.03)).toEqual({ text: "+0,1 pp", kind: "rounding" });
    expect(rest(0.029, 0.03)).toEqual({ text: "-0,1 pp", kind: "rounding" });
    expect(rest(0.03, 0.03)).toEqual({ text: "0,0 pp", kind: "rounding" });
    expect(rest(0.031001, 0.03).kind).toBe("notDelivered");
    expect(rest(0.028999, 0.03).kind).toBe("receivedMore");
  });
});
