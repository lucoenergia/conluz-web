import { SharingAgreementLifecycleSpine, Mui, colors, radii, selectSharingAgreementLifecycleView } from "conluz-web";

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

// In the app the rail sits inside the next-step banner, whose fill is brand.main
// (secondary.main once the cycle is closed); the rail's tones are tuned for that ground.
const OnBanner = ({ closed = false, children }: { closed?: boolean; children: any }) => (
  <Mui.Box
    sx={{ maxWidth: 960, bgcolor: closed ? colors.secondary.main : colors.brand.main, borderRadius: radii.large, p: 3 }}
  >
    {children}
  </Mui.Box>
);

export const DefineStep = () => (
  <OnBanner>
    <SharingAgreementLifecycleSpine view={views.defineIncomplete} />
  </OnBanner>
);

export const GenerateSendPublishSpan = () => (
  <OnBanner>
    <SharingAgreementLifecycleSpine view={views.generateAndSend} />
  </OnBanner>
);

export const RecordDatesStep = () => (
  <OnBanner>
    <SharingAgreementLifecycleSpine view={views.recordDates} />
  </OnBanner>
);

export const AllDone = () => (
  <OnBanner>
    <SharingAgreementLifecycleSpine view={views.allDone} />
  </OnBanner>
);

export const Closed = () => (
  <OnBanner closed>
    <SharingAgreementLifecycleSpine view={views.closed} />
  </OnBanner>
);
