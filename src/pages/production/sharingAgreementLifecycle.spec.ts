import { describe, it, expect } from "vitest";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
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
    const view = selectSharingAgreementLifecycleView({ kind: "ALL_DONE", totalCount: 12 }, PUBLISHED);

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
      { kind: "RECORD_APPLICATION_DATES", pendingCount: 2, totalCount: 12 },
      { kind: "ALL_DONE", totalCount: 12 },
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
    const view = selectSharingAgreementLifecycleView({ kind: "RECORD_APPLICATION_DATES", pendingCount: 3, totalCount: 12 }, PUBLISHED);

    expect(view.stages.map((stage) => stage.state)).toEqual(["done", "done", "unverifiable", "done", "current"]);
    expect(view.current?.requirement).toBe("3 coeficientes sin fecha de aplicación.");
    expect(view.isSpanActive).toBe(false);
  });

  it("uses the singular form for a single pending coefficient", () => {
    const view = selectSharingAgreementLifecycleView({ kind: "RECORD_APPLICATION_DATES", pendingCount: 1, totalCount: 12 }, PUBLISHED);

    expect(view.current?.requirement).toBe("1 coeficiente sin fecha de aplicación.");
  });

  it("reports a finished cycle with no current step and no outstanding work", () => {
    const view = selectSharingAgreementLifecycleView({ kind: "ALL_DONE", totalCount: 12 }, PUBLISHED);

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
  describe("the next step's headline, actions and blocking note", () => {
    // AC1: an action that would fail is never rendered. Publishing a draft whose
    // coefficients do not sum to exactly 1 is refused by the backend with a 409,
    // so stage 1 offers authoring instead and states what is missing as text.
    it("offers authoring, never publishing, for a draft with no coefficients", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" },
        DRAFT,
      );

      expect(view.primary).toEqual({ kind: "EDIT_COEFFICIENTS", label: "Editar a mano" });
      expect(view.secondary).toEqual({ kind: "IMPORT_FILE", label: "Importar TXT" });
      expect(view.blockedNote).toBe("Este acuerdo todavía no tiene coeficientes.");
      expect(view.headline).toBe(
        "Empieza por definir el reparto: añade los puntos de suministro y el coeficiente de cada uno.",
      );
    });

    it("offers authoring, never publishing, for a draft whose sum is off", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 250_000 },
        DRAFT,
      );

      expect(view.primary?.kind).toBe("EDIT_COEFFICIENTS");
      expect(view.secondary?.kind).toBe("IMPORT_FILE");
      expect(view.blockedNote).toBe(
        "«Poner en vigor» y «Generar el fichero» aparecerán cuando los coeficientes sumen 100,0000 %.",
      );
    });

    it("builds the shortfall headline from the shared gap message, not a second copy of it", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 250_000 },
        DRAFT,
      );

      expect(view.headline).toBe(`Completa el reparto: ${formatCoefficientGapMessage(250_000)}`);
    });

    // AC2.
    it("promotes publishing, with the download alongside it, once the draft is complete", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "GENERATE_AND_SEND", canGenerate: true }, DRAFT);

      expect(view.primary).toEqual({ kind: "PUBLISH", label: "Poner en vigor" });
      expect(view.secondary).toEqual({ kind: "DOWNLOAD_FILE", label: "Descargar fichero" });
      expect(view.blockedNote).toBeUndefined();
    });

    it("withholds the download when the plant has no CAU, keeping publish available", () => {
      // Generating 409s without a regulatory code, but the coefficients are
      // already sealed-worthy — publishing is unaffected by the missing CAU.
      const view = selectSharingAgreementLifecycleView(
        { kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" },
        DRAFT,
      );

      expect(view.primary?.kind).toBe("PUBLISH");
      expect(view.secondary).toBeUndefined();
      expect(view.current?.requirement).toBe(
        "La planta no tiene CAU configurado. Sin él no se puede generar el fichero.",
      );
    });

    it("offers recording the outstanding dates, counting them in the label", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "RECORD_APPLICATION_DATES", pendingCount: 4, totalCount: 12 },
        PUBLISHED,
      );

      expect(view.primary).toEqual({ kind: "RECORD_DATES", label: "Registrar fechas (4 pendientes)" });
      expect(view.secondary).toBeUndefined();
      expect(view.headline).toBe(
        "Registra la fecha de aplicación de los puntos que faltan: un punto sin fecha no recibe producción.",
      );
    });

    it("keeps the pending-count label grammatical at one", () => {
      const view = selectSharingAgreementLifecycleView(
        { kind: "RECORD_APPLICATION_DATES", pendingCount: 1, totalCount: 12 },
        PUBLISHED,
      );

      expect(view.primary?.label).toBe("Registrar fechas (1 pendiente)");
      expect(view.current?.requirement).toBe("1 coeficiente sin fecha de aplicación.");
    });

    it("offers no action once every point has a date", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "ALL_DONE", totalCount: 12 }, PUBLISHED);

      expect(view.primary).toBeUndefined();
      expect(view.secondary).toBeUndefined();
      expect(view.headline).toBe("12 puntos tienen fecha de aplicación: el reparto ya está aplicándose.");
    });

    it("offers no action on a superseded agreement, and does not claim it is unmodifiable", () => {
      // Correcting a date and reopening a closed coefficient stay available on a
      // superseded agreement — reopening one puts it back in force — so the copy
      // must not say the record cannot be changed.
      const view = selectSharingAgreementLifecycleView({ kind: "NONE" }, SUPERSEDED);

      expect(view.primary).toBeUndefined();
      expect(view.secondary).toBeUndefined();
      expect(view.headline).toBe(
        "Este acuerdo ya no está en vigor. Puedes consultarlo y corregir fechas de aplicación; reabrir un punto vuelve a poner el acuerdo en vigor.",
      );
      expect(view.headline).not.toMatch(/no se puede modificar|solo lectura/i);
    });

    it("claims no position, and offers nothing, while the data is still in flight", () => {
      const view = selectSharingAgreementLifecycleView({ kind: "NONE" }, DRAFT);

      expect(view.isIndeterminate).toBe(true);
      expect(view.headline).toBeUndefined();
      expect(view.railCaption).toBeUndefined();
      expect(view.primary).toBeUndefined();
      expect(view.secondary).toBeUndefined();
    });

    it("names the position on the rail for each live step", () => {
      const captionFor = (nextStep: SharingAgreementNextStep, status: StatusValue = DRAFT) =>
        selectSharingAgreementLifecycleView(nextStep, status).railCaption;

      expect(captionFor({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" })).toBe(
        "Paso 1 de 5 · Define el reparto",
      );
      expect(captionFor({ kind: "GENERATE_AND_SEND", canGenerate: true })).toBe(
        "Pasos 2, 3 y 4 en curso · Conluz no puede saber en cuál estás",
      );
      expect(
        captionFor({ kind: "RECORD_APPLICATION_DATES", pendingCount: 2, totalCount: 12 }, PUBLISHED),
      ).toBe("Paso 5 de 5 · Registra las fechas de aplicación");
      expect(captionFor({ kind: "ALL_DONE", totalCount: 12 }, PUBLISHED)).toBe("Los 5 pasos están hechos");
      expect(captionFor({ kind: "NONE" }, SUPERSEDED)).toBe("Ciclo cerrado · acuerdo histórico");
    });
  });
});
