import { SharingAgreementCoefficientCard, Mui } from "conluz-web";

const PUBLISHED_2025 = { id: "sa-2025", name: "Reparto 2025 · Planta Polideportivo", status: "PUBLISHED" };

const supplies = {
  ferrer: { id: "s1", code: "ES0031406912345678JN0F", name: "Casa Ferrer · C/ Sant Vicent 12" },
  bar: { id: "s2", code: "ES0031406987654321AB1Q", name: "Bar La Plaça" },
  unnamed: { id: "s3", code: "ES0031406911223344CD0R", name: null },
  escola: { id: "s4", code: "ES0031406955667788EF1S", name: "Escuela Infantil Els Xiquets" },
  nou: { id: "s5", code: "ES0031406999887766GH0T", name: null },
};

const coefficient = (overrides: Record<string, unknown>) =>
  ({
    coefficientId: "c-0",
    supply: supplies.ferrer,
    coefficient: 0.25,
    validFrom: null,
    validTo: null,
    applicationState: "PENDING",
    endState: "OPEN",
    endDate: null,
    currentCoefficient: null,
    ...overrides,
  }) as any;

// A PUBLISHED agreement mid-application: some points dated, some still on the 2025 coefficient,
// one new to the plant.
const publishedRows = [
  coefficient({ coefficientId: "c1", supply: supplies.ferrer, coefficient: 0.25, validFrom: "2026-04-01", applicationState: "APPLIED" }),
  coefficient({ coefficientId: "c2", supply: supplies.bar, coefficient: 0.208333, validFrom: "2026-04-01", applicationState: "APPLIED" }),
  coefficient({
    coefficientId: "c3",
    supply: supplies.unnamed,
    coefficient: 0.208333,
    currentCoefficient: { coefficient: 0.2, sharingAgreement: PUBLISHED_2025 },
  }),
  coefficient({ coefficientId: "c4", supply: supplies.nou, coefficient: 0.116667 }),
];

// A SUPERSEDED agreement: every row is closed, by hand or by the succeeding agreement.
const supersededRows = [
  coefficient({
    coefficientId: "c11", supply: supplies.ferrer, coefficient: 0.3, validFrom: "2025-02-01", validTo: "2026-04-01",
    applicationState: "APPLIED", endState: "DERIVED", endDate: "2026-04-01",
  }),
  coefficient({
    coefficientId: "c12", supply: supplies.bar, coefficient: 0.35, validFrom: "2025-02-01", validTo: "2026-04-01",
    applicationState: "APPLIED", endState: "DERIVED", endDate: "2026-04-01",
  }),
  coefficient({
    coefficientId: "c13", supply: supplies.escola, coefficient: 0.35, validFrom: "2025-02-01", validTo: "2025-11-30",
    applicationState: "APPLIED", endState: "CLOSED", endDate: "2025-11-30",
  }),
];

// A DRAFT compared against what is in force today.
const draftRows = [
  { row: coefficient({ coefficientId: "c21", supply: supplies.ferrer, coefficient: 0.25, currentCoefficient: { coefficient: 0.22, sharingAgreement: PUBLISHED_2025 } }), comparison: { kind: "inForce", coefficient: 0.22, power: { status: "success", installedPowerKw: 40 } } },
  { row: coefficient({ coefficientId: "c22", supply: supplies.bar, coefficient: 0.2, currentCoefficient: { coefficient: 0.2, sharingAgreement: PUBLISHED_2025 } }), comparison: { kind: "inForce", coefficient: 0.2, power: { status: "success", installedPowerKw: 40 } } },
  { row: coefficient({ coefficientId: "c23", supply: supplies.unnamed, coefficient: 0.175, currentCoefficient: { coefficient: 0.208333, sharingAgreement: PUBLISHED_2025 } }), comparison: { kind: "inForce", coefficient: 0.208333, power: { status: "success", installedPowerKw: 40 } } },
  { row: coefficient({ coefficientId: "c24", supply: supplies.nou, coefficient: 0.375 }), comparison: { kind: "new" } },
];

const INSTALLED_KW = 45.6;
const noop = () => {};

// The card is the phone layout of the coefficient set; the app swaps to it below `sm`.
const Phone = ({ children }: { children: any }) => <Mui.Box sx={{ maxWidth: 390 }}>{children}</Mui.Box>;

export const PublishedApplying = () => (
  <Phone>
    {publishedRows.map((row, i) => (
      <SharingAgreementCoefficientCard
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={INSTALLED_KW}
        showSelectionColumn
        selected={i === 2}
        onToggleSelected={noop}
        showActionsColumn
        showHistoryAction
        onOpenActionsMenu={noop}
      />
    ))}
  </Phone>
);

export const DraftComparedWithInForce = () => (
  <Phone>
    {draftRows.map(({ row, comparison }) => (
      <SharingAgreementCoefficientCard
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={INSTALLED_KW}
        isDraft
        showStateColumns={false}
        comparison={comparison as any}
        showActionsColumn
        showHistoryAction
        onOpenActionsMenu={noop}
      />
    ))}
  </Phone>
);

export const DraftEditing = () => (
  <Phone>
    {draftRows.map(({ row, comparison }, i) => (
      <SharingAgreementCoefficientCard
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={INSTALLED_KW}
        isDraft
        isEditing
        inputUnit="percentage"
        coefficientInput={["25,0000", "20", "17,5", ""][i]}
        editedValue={[0.25, 0.2, 0.175, undefined][i]}
        onCoefficientChange={noop}
        onRemove={noop}
        onRevert={i === 2 ? noop : undefined}
        showStateColumns={false}
        comparison={comparison as any}
      />
    ))}
  </Phone>
);

export const SupersededClosed = () => (
  <Phone>
    {supersededRows.map((row) => (
      <SharingAgreementCoefficientCard
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={40}
        showActionsColumn
        showHistoryAction
        onOpenActionsMenu={noop}
      />
    ))}
  </Phone>
);
