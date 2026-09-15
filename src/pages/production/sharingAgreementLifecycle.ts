import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import type { SharingAgreementNextStep } from "./selectSharingAgreementNextStep";
import { formatCoefficientGapMessage } from "./sharingAgreementGapMessage";
import { pluralize } from "../../utils/pluralize";

export type StageNumber = 1 | 2 | 3 | 4 | 5;

/**
 * Stage 3 leaves the application: the admin emails the TXT to the distributor.
 * `SharingAgreementResponse` carries no sent/delivered field — the backend has
 * no concept of it at all — so Conluz can never observe that it happened, and
 * the lifecycle must never claim otherwise. That is why stage 3 has its own
 * `unverifiable` state instead of ever being `done` or `current`.
 */
export const EXTERNAL_STAGE: StageNumber = 3;

export interface LifecycleStage {
  title: string;
  description: string;
}

export const STAGES: ReadonlyArray<LifecycleStage> = [
  { title: "Define el reparto", description: "Sube el TXT o introduce los coeficientes a mano hasta sumar 100,0000 %." },
  { title: "Genera el fichero", description: "Conluz construye el TXT para la distribuidora. No se guarda: se descarga." },
  { title: "Envíalo a la distribuidora", description: "Fuera de Conluz, por email. La aplicación no puede comprobar este paso." },
  { title: "Ponlo en vigor", description: "Sella el reparto cuando la distribuidora lo acepte. Deja de ser editable." },
  { title: "Registra las fechas de aplicación", description: "Marca la fecha en la que la distribuidora aplicó cada coeficiente." },
];

/**
 * `unverifiable` is stage 3's permanent state. `closed` belongs to a superseded
 * agreement, whose cycle ended regardless of how far it got.
 */
export type StageState = "done" | "current" | "pending" | "unverifiable" | "closed";

export interface LifecycleStageView extends LifecycleStage {
  number: StageNumber;
  state: StageState;
}

export interface LifecycleCurrentStep {
  title: string;
  body?: string;
  requirement?: string;
  secondaryLine?: string;
}

/**
 * What the next-step block offers. The selector names the *intent*; the header
 * binds it to a handler. Keeping handlers out means every rule about which
 * action is available in which state stays testable without rendering, and
 * stays in one place — this module — instead of being re-derived by whichever
 * component happens to render a button.
 */
export type LifecycleActionKind =
  | "EDIT_COEFFICIENTS"
  | "IMPORT_FILE"
  | "PUBLISH"
  | "DOWNLOAD_FILE"
  | "RECORD_DATES";

export interface LifecycleActionIntent {
  kind: LifecycleActionKind;
  label: string;
}

export interface LifecycleView {
  stages: LifecycleStageView[];
  /**
   * Stages 2-4 are live at the same time. Once the draft is complete the admin
   * generates, emails, and publishes without the application learning anything
   * in between, so the lifecycle highlights the whole span rather than pretending
   * to know which of the three they are on.
   */
  isSpanActive: boolean;
  /** Absent when there is nothing to do: still loading, closed, or finished. */
  current?: LifecycleCurrentStep;
  /** Terminal copy for a finished or closed cycle. */
  completionNote?: string;
  isClosed: boolean;
  isIndeterminate: boolean;
  /** The one sentence the next-step block leads with. Absent only while indeterminate. */
  headline?: string;
  /** Where in the cycle the rail says we are, e.g. "Paso 1 de 5 · Define el reparto". */
  railCaption?: string;
  primary?: LifecycleActionIntent;
  secondary?: LifecycleActionIntent;
  /**
   * Why the state-advancing action is absent, as visible text. An action that
   * would fail is not rendered at all, so the reason has to carry itself —
   * it is never a tooltip and never hangs off a button that isn't there.
   */
  blockedNote?: string;
}

function buildStages(stateFor: (stage: StageNumber) => StageState): LifecycleStageView[] {
  return STAGES.map((stage, index) => {
    const number = (index + 1) as StageNumber;
    return { ...stage, number, state: stateFor(number) };
  });
}

/** Stage 3 is never done and never current — see EXTERNAL_STAGE. */
function withExternalStage(stateFor: (stage: StageNumber) => StageState) {
  return (stage: StageNumber): StageState => (stage === EXTERNAL_STAGE ? "unverifiable" : stateFor(stage));
}

function currentStepFor(
  nextStep: Exclude<SharingAgreementNextStep, { kind: "NONE" } | { kind: "ALL_DONE" }>,
): LifecycleCurrentStep {
  switch (nextStep.kind) {
    case "AUTHOR_COEFFICIENTS":
      if (nextStep.blockedReason === "NO_COEFFICIENTS") {
        return {
          title: "Define el reparto",
          body: "Sube el fichero TXT de reparto o introduce los coeficientes a mano.",
          requirement: "Este acuerdo todavía no tiene coeficientes.",
        };
      }
      return {
        title: "Ajusta el reparto",
        body: "Los coeficientes deben sumar 100,0000 % antes de poder generar el fichero o poner el acuerdo en vigor.",
        requirement: formatCoefficientGapMessage(nextStep.deltaMillionths) ?? undefined,
      };

    case "GENERATE_AND_SEND":
      if (nextStep.canGenerate) {
        return {
          title: "Genera el fichero y envíalo a la distribuidora",
          body: "Conluz construye el TXT a partir de los coeficientes y lo descarga. El envío se hace fuera de la aplicación, por email.",
          secondaryLine: "Cuando la distribuidora confirme que lo ha aplicado, pon el acuerdo en vigor.",
        };
      }
      return {
        title: "Genera el fichero y envíalo a la distribuidora",
        requirement: "La planta no tiene CAU configurado. Sin él no se puede generar el fichero.",
        secondaryLine: "Cuando la distribuidora confirme que lo ha aplicado, pon el acuerdo en vigor.",
      };

    case "RECORD_APPLICATION_DATES":
      return {
        title: "Registra las fechas de aplicación",
        body: "Marca la fecha en la que la distribuidora aplicó cada coeficiente.",
        requirement: `${nextStep.pendingCount} ${pluralize(
          nextStep.pendingCount,
          "coeficiente sin fecha de aplicación.",
          "coeficientes sin fecha de aplicación.",
        )}`,
      };
  }
}

/**
 * Total mapping from the next-step machine to what the lifecycle rail shows.
 * Every `SharingAgreementNextStep` variant is covered here rather than in the
 * component, so the honest-state rules are testable without rendering.
 */
export function selectSharingAgreementLifecycleView(
  nextStep: SharingAgreementNextStep,
  status: StatusValue | undefined,
): LifecycleView {
  if (status === SharingAgreementResponseStatus.SUPERSEDED) {
    return {
      stages: buildStages(() => "closed"),
      isSpanActive: false,
      completionNote: "Este acuerdo fue sustituido por otro. Su ciclo está cerrado.",
      isClosed: true,
      isIndeterminate: false,
      // Deliberately not "no se puede modificar": a superseded agreement still
      // accepts date corrections and reopening a closed coefficient, and
      // reopening one puts the agreement back in force. The copy has to match
      // what the row actions actually allow.
      headline:
        "Este acuerdo ya no está en vigor. Puedes consultarlo y corregir fechas de aplicación; reabrir un punto vuelve a poner el acuerdo en vigor.",
      railCaption: "Ciclo cerrado · acuerdo histórico",
    };
  }

  if (nextStep.kind === "NONE") {
    // Either the agreement or its coefficients are still in flight. Claim no
    // position rather than briefly showing stage 1 for data that may say otherwise.
    return {
      stages: buildStages(withExternalStage(() => "pending")),
      isSpanActive: false,
      isClosed: false,
      isIndeterminate: true,
    };
  }

  if (nextStep.kind === "ALL_DONE") {
    return {
      stages: buildStages(withExternalStage(() => "done")),
      isSpanActive: false,
      completionNote: "El reparto está en vigor y todos los coeficientes tienen fecha de aplicación.",
      isClosed: false,
      isIndeterminate: false,
      headline: `${nextStep.totalCount} ${pluralize(
        nextStep.totalCount,
        "punto tiene fecha de aplicación",
        "puntos tienen fecha de aplicación",
      )}: el reparto ya está aplicándose.`,
      railCaption: "Los 5 pasos están hechos",
    };
  }

  const current = currentStepFor(nextStep);

  if (nextStep.kind === "AUTHOR_COEFFICIENTS") {
    const isEmptySet = nextStep.blockedReason === "NO_COEFFICIENTS";
    return {
      stages: buildStages(withExternalStage((stage) => (stage === 1 ? "current" : "pending"))),
      isSpanActive: false,
      current,
      isClosed: false,
      isIndeterminate: false,
      headline: isEmptySet
        ? "Empieza por definir el reparto: añade los puntos de suministro y el coeficiente de cada uno."
        : `Completa el reparto: ${formatCoefficientGapMessage(nextStep.deltaMillionths) ?? ""}`,
      railCaption: "Paso 1 de 5 · Define el reparto",
      // Authoring, not publishing. Neither "Poner en vigor" nor "Generar el
      // fichero" is offered here at all: both would 409 on a set that doesn't
      // sum to exactly 1, and an action that is going to fail is not rendered.
      primary: { kind: "EDIT_COEFFICIENTS", label: "Editar a mano" },
      secondary: { kind: "IMPORT_FILE", label: "Importar TXT" },
      blockedNote: isEmptySet
        ? "Este acuerdo todavía no tiene coeficientes."
        : "«Poner en vigor» y «Generar el fichero» aparecerán cuando los coeficientes sumen 100,0000 %.",
    };
  }

  if (nextStep.kind === "GENERATE_AND_SEND") {
    return {
      stages: buildStages(
        withExternalStage((stage) => {
          if (stage === 1) return "done";
          if (stage === 2 || stage === 4) return "current";
          return "pending";
        }),
      ),
      isSpanActive: true,
      current,
      isClosed: false,
      isIndeterminate: false,
      headline:
        "El reparto suma 100,0000 %. Genera el fichero, envíalo a la distribuidora y, cuando lo acepte, pon el acuerdo en vigor.",
      railCaption: "Pasos 2, 3 y 4 en curso · Conluz no puede saber en cuál estás",
      primary: { kind: "PUBLISH", label: "Poner en vigor" },
      // Without a CAU the generate endpoint 409s, so the download is not
      // offered; `current.requirement` already states why in visible text.
      secondary: nextStep.canGenerate ? { kind: "DOWNLOAD_FILE", label: "Descargar fichero" } : undefined,
    };
  }

  return {
    stages: buildStages(withExternalStage((stage) => (stage === 5 ? "current" : "done"))),
    isSpanActive: false,
    current,
    isClosed: false,
    isIndeterminate: false,
    headline:
      "Registra la fecha de aplicación de los puntos que faltan: un punto sin fecha no recibe producción.",
    railCaption: "Paso 5 de 5 · Registra las fechas de aplicación",
    primary: {
      kind: "RECORD_DATES",
      label: `Registrar fechas (${nextStep.pendingCount} ${pluralize(
        nextStep.pendingCount,
        "pendiente",
        "pendientes",
      )})`,
    },
  };
}
