import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router";
import type {
  CoefficientDatesEffectsResponse,
  SharingAgreementObservationResponse,
  SharingAgreementPartitionCoefficientResponse,
  SharingAgreementResponse,
} from "../../../api/models";
import { ActionStatus } from "../../../components/ActionStatus";
import { sxStyles } from "../../../theme/sx";
import type { CoefficientDatesRowErrorDetail } from "../../../errors/apiErrorCatalogue";
import type { Action } from "../../../hooks/actions/action";
import type { CoefficientDatesRequest, CoefficientDatesResult } from "../../../hooks/actions/useSharingAgreementCoefficientActions";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { isCoefficientDateValid } from "../coefficientDateValidation";
import { StepIndicator, type FlowStep } from "./ApplicationDatesParts";
import { DRY_RUN_DELAY_MS } from "./dryRunDelay";
import {
  buildDatesRequest,
  initialDateRows,
  initialLeavingDates,
  observedLeavings,
  previewBlocker,
  requestKey,
  type LeavingDate,
} from "./applicationDatesRows";
import { DatesStep } from "./DatesStep";
import { PreviewStep, type NamedRowError, type PreviewState } from "./PreviewStep";
import { ResultStep, type WriteOutcome } from "./ResultStep";


type DatesAction = Action<[CoefficientDatesRequest], CoefficientDatesResult>;

export interface ApplicationDatesFlowProps {
  agreement: SharingAgreementResponse;
  coefficients: SharingAgreementPartitionCoefficientResponse[];
  /** The agreement's observation, when the flow was opened from observed sharing. */
  observation: SharingAgreementObservationResponse | undefined;
  previewDates: DatesAction;
  setDates: DatesAction;
  agreementPath: string;
  observationPath: string;
}

interface Refusal {
  rows: CoefficientDatesRowErrorDetail[];
  general: string[];
}

/**
 * The three steps of setting an agreement's application dates (#419). Seeded
 * once, from the data its page waited for: the dates entered survive every
 * step, a refused write and a refetch of the agreement underneath.
 */
export const ApplicationDatesFlow: FC<ApplicationDatesFlowProps> = ({
  agreement,
  coefficients,
  observation,
  previewDates,
  setDates,
  agreementPath,
  observationPath,
}) => {
  const navigate = useNavigate();
  const fromObserved = observation !== undefined;
  const leavings = useMemo(() => observedLeavings(observation), [observation]);

  const [step, setStep] = useState<FlowStep>("dates");
  const [rows, setRows] = useState(() => initialDateRows(coefficients, observation));
  const [leavingDates, setLeavingDates] = useState<Record<string, LeavingDate>>(() => initialLeavingDates(leavings));
  const [preview, setPreview] = useState<{ key: string; state: PreviewState } | undefined>(undefined);
  const [lastEffects, setLastEffects] = useState<CoefficientDatesEffectsResponse | undefined>(undefined);
  const [refusal, setRefusal] = useState<Refusal | undefined>(undefined);
  const [writeOutcome, setWriteOutcome] = useState<WriteOutcome | undefined>(undefined);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const latestPreviewKey = useRef<string | undefined>(undefined);

  const request = useMemo(() => buildDatesRequest(rows, leavingDates), [rows, leavingDates]);
  const currentKey = requestKey(request);
  const blocker = previewBlocker(rows, leavingDates);

  // Each step starts at its heading, for the eye and for assistive
  // technology; the page arrives on the first step without moving focus.
  // Compared with the step last focused, so an effect run twice on mount
  // (StrictMode) does not count as a change.
  const focusedStep = useRef<FlowStep>(step);
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const runPreview = async (toRun: CoefficientDatesRequest) => {
    const key = requestKey(toRun);
    latestPreviewKey.current = key;
    setPreview({ key, state: { status: "loading" } });
    const result = await previewDates.run(toRun);
    // An answer to a request since replaced by a newer one is dropped.
    if (latestPreviewKey.current !== key) return;
    if (result.kind === "applied") {
      setPreview({ key, state: { status: "applied", effects: result.effects } });
      setLastEffects(result.effects);
      setRefusal(undefined);
    } else if (result.kind === "refused") {
      setPreview({ key, state: { status: "refused", rows: result.rows, general: result.general } });
      setRefusal({ rows: result.rows, general: result.general });
    } else {
      setPreview({ key, state: { status: "failed" } });
    }
  };

  // A closing date changed on the preview runs it again, with that date
  // listed (UI-AGR-034), once the admin has stopped typing.
  // The effect reads the request through a ref: it is a new object every
  // render, and its key is what decides whether to run.
  const rerun = useRef(() => {});
  rerun.current = () => void runPreview(request);
  const previewKey = preview?.key;
  useEffect(() => {
    if (step !== "preview" || previewKey === undefined || previewKey === currentKey) return;
    const timer = setTimeout(() => rerun.current(), DRY_RUN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step, currentKey, previewKey]);

  const supplyNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const leaving of leavings) names.set(leaving.supply.id, supplyDisplayLabel(leaving.supply));
    for (const closure of lastEffects?.leavingClosures ?? []) names.set(closure.supply.id, supplyDisplayLabel(closure.supply));
    return names;
  }, [leavings, lastEffects]);
  const coefficientNames = useMemo(
    () => new Map(rows.map((row) => [row.coefficientId, supplyDisplayLabel(row.supply)])),
    [rows],
  );
  const coefficientValues = useMemo(() => new Map(coefficients.map((row) => [row.coefficientId, row.coefficient])), [coefficients]);

  const namedErrorsOf = (source: Refusal | undefined): NamedRowError[] => [
    ...(source?.rows ?? []).map((row) => ({
      name: (row.coefficientId && coefficientNames.get(row.coefficientId)) || (row.supplyId && supplyNames.get(row.supplyId)) || undefined,
      message: row.message,
    })),
    ...(source?.general ?? []).map((message) => ({ name: undefined, message })),
  ];

  const rowErrors = useMemo(() => {
    const byCoefficient = new Map<string, string[]>();
    for (const row of refusal?.rows ?? []) {
      if (row.coefficientId) byCoefficient.set(row.coefficientId, [...(byCoefficient.get(row.coefficientId) ?? []), row.message]);
    }
    return byCoefficient;
  }, [refusal]);
  const errorsBySupply = useMemo(() => {
    const bySupply = new Map<string, string[]>();
    for (const row of refusal?.rows ?? []) {
      if (!row.coefficientId && row.supplyId) bySupply.set(row.supplyId, [...(bySupply.get(row.supplyId) ?? []), row.message]);
    }
    return bySupply;
  }, [refusal]);

  const hasUnusableClosingDate = Object.values(leavingDates).some(
    (leaving) => leaving.date !== null && !isCoefficientDateValid(leaving.date, leaving.dateError),
  );

  /** Why "Confirmar y aplicar" is disabled: anything but an error-free dry run of what is entered now (UI-AGR-034). */
  const confirmBlocker = (() => {
    if (hasUnusableClosingDate) return "Corrige la fecha de cierre o bórrala para confirmar.";
    if (!preview || preview.key !== currentKey || preview.state.status === "loading") return "Calculando la vista previa…";
    if (preview.state.status === "failed") return "No se pudo calcular la vista previa.";
    if (preview.state.status === "refused") {
      const named = namedErrorsOf(refusal).filter((error) => error.name);
      return named.length === 1
        ? `Corrige el error de ${named[0].name} o desmárcalo para confirmar.`
        : "Corrige los errores o desmarca esos puntos para confirmar.";
    }
    return null;
  })();

  const handlePreview = () => {
    if (blocker) return;
    setStep("preview");
    void runPreview(request);
  };

  const handleConfirm = async () => {
    if (confirmBlocker) return;
    const result = await setDates.run(request);
    if (result.kind === "applied") {
      setWriteOutcome({ status: "applied", effects: result.effects });
      setAnnouncement(`Fechas aplicadas en ${agreement.name}.`);
    } else if (result.kind === "refused") {
      const written: Refusal = { rows: result.rows, general: result.general };
      setRefusal(written);
      setWriteOutcome({ status: "refused", errors: namedErrorsOf(written) });
    } else {
      setWriteOutcome({ status: "failed" });
    }
    setStep("result");
  };

  const handleBackToPreview = () => {
    setWriteOutcome(undefined);
    setStep("preview");
    void runPreview(request);
  };

  const handleCancel = () => navigate(fromObserved ? observationPath : agreementPath);

  return (
    <>
      <ActionStatus message={announcement} />
      <Box sx={sxStyles.pageContainer}>
        <Box sx={sxStyles.softPanel}>
          <StepIndicator current={step} />
        </Box>
      </Box>

      {step === "dates" && (
        <DatesStep
          rows={rows}
          onRowsChange={setRows}
          fromObserved={fromObserved}
          leavings={leavings}
          observationPath={observationPath}
          rowErrors={rowErrors}
          blocker={blocker}
          headingRef={headingRef}
          onPreview={handlePreview}
          onCancel={handleCancel}
        />
      )}

      {step === "preview" && preview && (
        <PreviewStep
          state={preview.key === currentKey ? preview.state : { status: "loading" }}
          lastEffects={lastEffects}
          coefficientValues={coefficientValues}
          namedErrors={namedErrorsOf(refusal)}
          errorsBySupply={errorsBySupply}
          leavings={leavings}
          leavingDates={leavingDates}
          onLeavingDateChange={(supplyId, value) => setLeavingDates((current) => ({ ...current, [supplyId]: value }))}
          distributorFileSentOn={agreement.distributorFileSentOn}
          confirmBlocker={confirmBlocker}
          isConfirming={setDates.isPending}
          headingRef={headingRef}
          onBack={() => setStep("dates")}
          onRetry={() => void runPreview(request)}
          onConfirm={() => void handleConfirm()}
        />
      )}

      {step === "result" && writeOutcome && (
        <ResultStep
          outcome={writeOutcome}
          agreementName={agreement.name}
          agreementPath={agreementPath}
          observationPath={fromObserved ? observationPath : undefined}
          headingRef={headingRef}
          onBackToPreview={handleBackToPreview}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
