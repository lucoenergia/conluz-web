import { SharingAgreementNextStepBanner, Mui, selectSharingAgreementLifecycleView } from "conluz-web";

// Views come from the app's own selector, fed the next-step states the detail
// page derives (selectSharingAgreementNextStep) — so the copy never drifts.
const view = (nextStep: any, status: "DRAFT" | "PUBLISHED" | "SUPERSEDED") =>
  selectSharingAgreementLifecycleView(nextStep, status) as any;

const views = {
  defineEmpty: view({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" }, "DRAFT"),
  defineIncomplete: view({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 79126 }, "DRAFT"),
  generateAndSend: view({ kind: "GENERATE_AND_SEND", canGenerate: true }, "DRAFT"),
  generateNoCau: view({ kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" }, "DRAFT"),
  recordDates: view({ kind: "RECORD_APPLICATION_DATES", pendingCount: 3, totalCount: 9, hasPendingWithoutCurrent: true }, "PUBLISHED"),
  allDone: view({ kind: "ALL_DONE", totalCount: 6 }, "PUBLISHED"),
  closed: view({ kind: "NONE" }, "SUPERSEDED"),
};

const noop = () => {};
const handlers = {
  EDIT_COEFFICIENTS: noop,
  IMPORT_FILE: noop,
  PUBLISH: noop,
  DOWNLOAD_FILE: noop,
  RECORD_DATES: noop,
};

const wrap = (children: any) => <Mui.Box sx={{ maxWidth: 960 }}>{children}</Mui.Box>;

export const DefineEmpty = () => wrap(<SharingAgreementNextStepBanner view={views.defineEmpty} handlers={handlers} />);

export const DefineIncomplete = () => wrap(<SharingAgreementNextStepBanner view={views.defineIncomplete} handlers={handlers} />);

export const GenerateAndPublish = () => wrap(<SharingAgreementNextStepBanner view={views.generateAndSend} handlers={handlers} />);

export const GenerateBlockedNoCau = () => wrap(<SharingAgreementNextStepBanner view={views.generateNoCau} handlers={handlers} />);

export const RecordDates = () =>
  wrap(
    <SharingAgreementNextStepBanner
      view={views.recordDates}
      handlers={handlers}
      revert={{ label: "Volver a borrador", onClick: noop }}
    />,
  );

export const SupersededClosed = () => wrap(<SharingAgreementNextStepBanner view={views.closed} handlers={handlers} isClosed />);
