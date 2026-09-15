import { describe, it, expect } from "vitest";
import { SharingAgreementResponseStatus } from "../../api/models";
import { selectSharingAgreementLifecycleView, EXTERNAL_STAGE } from "./sharingAgreementLifecycle";
import type { SharingAgreementNextStep } from "./selectSharingAgreementNextStep";
import { formatCoefficientGapMessage } from "./sharingAgreementGapMessage";

const DRAFT = SharingAgreementResponseStatus.DRAFT;
const PUBLISHED = SharingAgreementResponseStatus.PUBLISHED;
const SUPERSEDED = SharingAgreementResponseStatus.SUPERSEDED;

function statesOf(nextStep: SharingAgreementNextStep, status = DRAFT) {
  return selectSharingAgreementLifecycleView(nextStep, status).stages.map((stage) => stage.state);
}

describe("selectSharingAgreementLifecycleView", () => {
  it("always renders the five stages, in order", () => {
    const view = selectSharingAgreementLifecycleView({ kind: "ALL_DONE" }, PUBLISHED);

    expect(view.stages.map((stage) => stage.number)).toEqual([1, 2, 3, 4, 5]);
    expect(view.stages.map((stage) => stage.title)).toEqual([
      "Define el reparto",
      "Genera el fichero",
      "Envíalo a la distribuidora",
      "Ponlo en vigor",
      "Registra las fechas de aplicación",
    ]);
  });

  describe("stage 3 is never claimed", () => {
    // The backend has no sent/delivered field, so the application can never observe
    // that the TXT reached the distributor. Marking it done would be a lie, and
    // marking it current would imply Conluz is waiting on something it can see.
    const everyNextStep: SharingAgreementNextStep[] = [
      { kind: "NONE" },
      { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" },
      { kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 50_000 },
      { kind: "GENERATE_AND_SEND", canGenerate: true },
      { kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" },
      { kind: "RECORD_APPLICATION_DATES", pendingCount: 2 },
      { kind: "ALL_DONE" },
    ];

    it.each(everyNextStep)("is never done and never current for $kind", (nextStep) => {
      const stage3 = selectSharingAgreementLifecycleView(nextStep, DRAFT).stages[EXTERNAL_STAGE - 1];

      expect(stage3.state).toBe("unverifiable");
    });
  });

  it("puts stage 1 alone as current while coefficients are still being authored", () => {
    expect(statesOf({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" })).toEqual([
      "current",
      "pending",
      "unverifiable",
      "pending",
      "pending",
    ]);
    expect(selectSharingAgreementLifecycleView({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" }, DRAFT).isSpanActive).toBe(false);
  });

  it("makes stages 2 and 4 current together once the draft is complete — the span the app cannot see inside", () => {
    const nextStep: SharingAgreementNextStep = { kind: "GENERATE_AND_SEND", canGenerate: true };

    expect(statesOf(nextStep)).toEqual(["done", "current", "unverifiable", "current", "pending"]);
    expect(selectSharingAgreementLifecycleView(nextStep, DRAFT).isSpanActive).toBe(true);
  });

  it("keeps the span active when generation is blocked, because publishing is still reachable", () => {
    const nextStep: SharingAgreementNextStep = {
      kind: "GENERATE_AND_SEND",
      canGenerate: false,
      blockedReason: "NO_REGULATORY_CODE",
    };
    const view = selectSharingAgreementLifecycleView(nextStep, DRAFT);

    expect(view.isSpanActive).toBe(true);
    expect(view.current?.requirement).toBe("La planta no tiene CAU configurado. Sin él no se puede generar el fichero.");
    expect(view.current?.secondaryLine).toBe("Cuando la distribuidora confirme que lo ha aplicado, pon el acuerdo en vigor.");
  });

  it("moves to stage 5 once the agreement is in force with coefficients still pending", () => {
    const view = selectSharingAgreementLifecycleView({ kind: "RECORD_APPLICATION_DATES", pendingCount: 3 }, PUBLISHED);

    expect(view.stages.map((stage) => stage.state)).toEqual(["done", "done", "unverifiable", "done", "current"]);
    expect(view.current?.requirement).toBe("3 coeficientes sin fecha de aplicación.");
    expect(view.isSpanActive).toBe(false);
  });

  it("uses the singular form for a single pending coefficient", () => {
    const view = selectSharingAgreementLifecycleView({ kind: "RECORD_APPLICATION_DATES", pendingCount: 1 }, PUBLISHED);

    expect(view.current?.requirement).toBe("1 coeficiente sin fecha de aplicación.");
  });

  it("reports a finished cycle with no current step and no outstanding work", () => {
    const view = selectSharingAgreementLifecycleView({ kind: "ALL_DONE" }, PUBLISHED);

    expect(view.stages.every((stage) => stage.state === "done" || stage.state === "unverifiable")).toBe(true);
    expect(view.current).toBeUndefined();
    expect(view.completionNote).toBe("El reparto está en vigor y todos los coeficientes tienen fecha de aplicación.");
  });

  describe("superseded", () => {
    it("closes every stage and offers no current step, whatever the next-step machine says", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "NONE" }, SUPERSEDED);

      expect(view.stages.map((stage) => stage.state)).toEqual(["closed", "closed", "closed", "closed", "closed"]);
      expect(view.isClosed).toBe(true);
      expect(view.current).toBeUndefined();
      expect(view.isSpanActive).toBe(false);
    });

    it("wins over any live next step, so a stale selector result can never revive a closed agreement", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "GENERATE_AND_SEND", canGenerate: true }, SUPERSEDED);

      expect(view.isClosed).toBe(true);
      expect(view.current).toBeUndefined();
    });
  });

  describe("still loading", () => {
    it("claims no position rather than briefly showing stage 1", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "NONE" }, DRAFT);

      expect(view.isIndeterminate).toBe(true);
      expect(view.current).toBeUndefined();
      expect(view.stages.some((stage) => stage.state === "current")).toBe(false);
      expect(view.stages.some((stage) => stage.state === "done")).toBe(false);
    });

    it("is not treated as loading once a real step is known", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "GENERATE_AND_SEND", canGenerate: true }, DRAFT);

      expect(view.isIndeterminate).toBe(false);
    });
  });

  describe("authoring copy", () => {
    it("states the gap with a positive delta, via the shared percentage formatter", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 50_000 },
        DRAFT,
      );

      expect(view.current?.title).toBe("Ajusta el reparto");
      expect(view.current?.requirement).toBe(formatCoefficientGapMessage(50_000));
    });

    it("states the excess with a negative delta", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: -100_000 },
        DRAFT,
      );

      expect(view.current?.requirement).toBe(formatCoefficientGapMessage(-100_000));
    });

    it("states the empty-set requirement", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" },
        DRAFT,
      );

      expect(view.current?.title).toBe("Define el reparto");
      expect(view.current?.requirement).toBe("Este acuerdo todavía no tiene coeficientes.");
    });
  });
});
