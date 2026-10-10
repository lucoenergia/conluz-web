import { SharingAgreementCoefficientTableRow, Mui, colors } from "conluz-web";

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
const headerSx = { fontWeight: 600, color: "secondary.main" } as const;
const Th = ({ children, align }: { children?: any; align?: "right" }) => (
  <Mui.TableCell align={align}>
    {children && (
      <Mui.Typography variant="subtitle2" sx={headerSx}>
        {children}
      </Mui.Typography>
    )}
  </Mui.TableCell>
);

/** Mirrors the desktop table of SharingAgreementCoefficientSet. */
const CoefficientTable = ({
  coefficientHeader,
  powerHeader = "Potencia asignada",
  showStateColumns = true,
  selection = false,
  editing = false,
  actions = false,
  children,
}: {
  coefficientHeader: string;
  powerHeader?: string;
  showStateColumns?: boolean;
  selection?: boolean;
  editing?: boolean;
  actions?: boolean;
  children: any;
}) => (
  <Mui.TableContainer>
    <Mui.Table size="small">
      <Mui.TableHead>
        <Mui.TableRow sx={{ backgroundColor: colors.background.surface }}>
          {selection && (
            <Mui.TableCell padding="checkbox">
              <Mui.Checkbox inputProps={{ "aria-label": "Seleccionar todas las filas visibles" }} />
            </Mui.TableCell>
          )}
          <Th>Punto</Th>
          <Th>CUPS</Th>
          <Th align="right">{coefficientHeader}</Th>
          <Th align="right">{powerHeader}</Th>
          {showStateColumns && <Th>Estado de aplicación</Th>}
          {showStateColumns && <Th>Estado de fin</Th>}
          {editing && <Mui.TableCell />}
          {actions && <Mui.TableCell padding="checkbox" />}
        </Mui.TableRow>
      </Mui.TableHead>
      <Mui.TableBody>{children}</Mui.TableBody>
    </Mui.Table>
  </Mui.TableContainer>
);

export const PublishedApplying = () => (
  <CoefficientTable coefficientHeader="Coeficiente (%)" actions>
    {publishedRows.map((row) => (
      <SharingAgreementCoefficientTableRow
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={INSTALLED_KW}
        showActionsColumn
        showHistoryAction
        onOpenActionsMenu={noop}
      />
    ))}
  </CoefficientTable>
);

export const DraftComparedWithInForce = () => (
  <CoefficientTable coefficientHeader="Coeficiente" showStateColumns={false} actions>
    {draftRows.map(({ row, comparison }) => (
      <SharingAgreementCoefficientTableRow
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
  </CoefficientTable>
);

const editInputs = ["25,0000", "20", "17,5", ""];
const editValues = [0.25, 0.2, 0.175, undefined];

export const DraftEditingPercentage = () => (
  <CoefficientTable coefficientHeader="Coeficiente" showStateColumns={false} editing>
    {draftRows.map(({ row, comparison }, i) => (
      <SharingAgreementCoefficientTableRow
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={INSTALLED_KW}
        isDraft
        isEditing
        inputUnit="percentage"
        coefficientInput={editInputs[i]}
        editedValue={editValues[i]}
        onCoefficientChange={noop}
        onRemove={noop}
        onRevert={i === 2 ? noop : undefined}
        showStateColumns={false}
        comparison={comparison as any}
      />
    ))}
  </CoefficientTable>
);

export const DraftEditingKilowatts = () => (
  <CoefficientTable coefficientHeader="Potencia (kW)" powerHeader="% equivalente" showStateColumns={false} editing>
    {draftRows.slice(0, 3).map(({ row, comparison }, i) => (
      <SharingAgreementCoefficientTableRow
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={INSTALLED_KW}
        isDraft
        isEditing
        inputUnit="kw"
        coefficientInput={["11,40", "9,12", "52"][i]}
        editedValue={[0.25, 0.2, 52 / INSTALLED_KW][i]}
        onCoefficientChange={noop}
        onRemove={noop}
        showStateColumns={false}
        comparison={comparison as any}
      />
    ))}
  </CoefficientTable>
);

export const SupersededClosed = () => (
  <CoefficientTable coefficientHeader="Coeficiente (%)" actions>
    {supersededRows.map((row) => (
      <SharingAgreementCoefficientTableRow
        key={row.coefficientId}
        coefficient={row}
        installedPowerKw={40}
        showActionsColumn
        showHistoryAction
        onOpenActionsMenu={noop}
      />
    ))}
  </CoefficientTable>
);
