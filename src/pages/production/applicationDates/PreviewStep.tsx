import { useState, type FC, type ReactNode, type Ref } from "react";
import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  LeavingClosureChangeResponseSource,
  type CoefficientDatesEffectsResponse,
  type CoefficientPeriodChangeResponse,
  type LeavingClosureChangeResponse,
  type NeighbourChangeResponse,
  type SupplyReferenceResponse,
} from "../../../api/models";
import { ListTable } from "../../../components/ListTable";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { Notice } from "../../../components/Notice";
import { RecordList, type RecordField } from "../../../components/RecordList";
import { ResponsiveRecordList } from "../../../components/ResponsiveRecordList";
import { SectionHeading } from "../../../components/SectionHeading";
import type { CoefficientDatesRowErrorDetail } from "../../../errors/apiErrorCatalogue";
import { sxStyles } from "../../../theme/sx";
import { colors, fontFamilies, fontSizes } from "../../../theme/tokens";
import {
  datedCoefficientsLabel,
  fixRowsHint,
  leavingSuppliesLabel,
  movedEndsLabel,
  rowsWithErrors,
} from "./applicationDatesCopy";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { localDateAt } from "../../../utils/zonedTime";
import { isCoefficientDateValid } from "../coefficientDateValidation";
import { ObservationChip } from "../observedSharing/ObservationChip";
import { formatBeta, formatDay } from "../observedSharing/observedSharingFormat";
import { DayField, FlowActionBar } from "./ApplicationDatesParts";
import {
  communityStartChanges,
  formatCommunityStartChange,
  formatEffectEnd,
  formatEffectPeriod,
  formatStatusChange,
  isBeforeSentDate,
  leavingSupplyCount,
  neighboursBySupply,
  statusChanges,
} from "./applicationDatesEffects";
import { isEdited, type LeavingDate, type ObservedLeaving } from "./applicationDatesRows";

/** How many coefficient rows show before "Mostrar los N". */
const INITIAL_ROWS = 10;

/** The marker of a closure the backend applies by default on a first activation (UI-AGR-034). */
export const DEFAULT_CLOSURE_LABEL = "Cierre por defecto: fecha más temprana del acuerdo";

/** What the preview step shows: the dry run in flight, its effects, or why there are none. */
export type PreviewState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "refused"; rows: CoefficientDatesRowErrorDetail[]; general: string[] }
  | { status: "applied"; effects: CoefficientDatesEffectsResponse };

/** A refused row named by the supply it is about, in the words the catalogue gives. */
export interface NamedRowError {
  name: string | undefined;
  message: string;
}

/** The mark of a coefficient the backend flags as taking its supply out of the distribution (UI-AGR-034). */
export const LEAVES_AT_ZERO_LABEL = "Sale del reparto (0 %)";

/** A supply leaving the distribution, as the preview lists it. */
interface LeavingRow {
  supply: SupplyReferenceResponse;
  previousAgreementName: string;
  /** The effect the dry run reported; absent for a leaving supply it closes nothing for. */
  closure: LeavingClosureChangeResponse | undefined;
  observed: ObservedLeaving | undefined;
}

/**
 * Every supply that leaves with the agreement, from what the dry run reported
 * and what observed sharing saw: a closure the request did not list and the
 * backend does not apply by default is still offered, with its observed hint,
 * so it can be given a date (UI-AGR-034).
 */
function leavingRowsOf(effects: CoefficientDatesEffectsResponse | undefined, observed: ObservedLeaving[]): LeavingRow[] {
  const rows: LeavingRow[] = (effects?.leavingClosures ?? []).map((closure) => ({
    supply: closure.supply,
    previousAgreementName: closure.sharingAgreement.name,
    closure,
    observed: observed.find((leaving) => leaving.supply.id === closure.supply.id),
  }));
  for (const leaving of observed) {
    if (!rows.some((row) => row.supply.id === leaving.supply.id)) {
      rows.push({ supply: leaving.supply, previousAgreementName: leaving.previousAgreementName, closure: undefined, observed: leaving });
    }
  }
  return rows;
}

const SummaryFigure: FC<{ value: number; label: string }> = ({ value, label }) => (
  <Box sx={{ flex: "1 1 0", minWidth: 0, bgcolor: colors.background.surface, borderRadius: 1, p: { xs: 1.5, md: 2 } }}>
    <Typography sx={{ fontSize: fontSizes["2xl"], fontWeight: 700, fontVariantNumeric: "tabular-nums", color: colors.text.primary }}>
      {value}
    </Typography>
    <Typography variant="body2" sx={{ color: colors.text.secondary }}>
      {label}
    </Typography>
  </Box>
);

/** The period a coefficient gets, and, when it starts before the file was sent, a note that does not block (UI-AGR-034). */
const NewPeriod: FC<{ row: CoefficientPeriodChangeResponse; distributorFileSentOn: string | null | undefined }> = ({
  row,
  distributorFileSentOn,
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
    <span>{formatEffectPeriod(row.validFromAfter, row.validToAfter)}</span>
    {distributorFileSentOn && isBeforeSentDate(row.validFromAfter, distributorFileSentOn) && (
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", color: colors.text.body }}>
        <InfoOutlinedIcon sx={{ fontSize: 18, mt: "2px", color: colors.text.subtle }} />
        <Typography variant="body2">
          Esta fecha es anterior al envío del fichero ({formatDay(distributorFileSentOn)}). No impide confirmar.
        </Typography>
      </Box>
    )}
  </Box>
);

/** "Reparto inicial 2023 · Fin 23/05/2024 → 01/02/2024", one line per neighbour of the supply whose end moves. */
const NeighbourChanges: FC<{ neighbours: NeighbourChangeResponse[] | undefined }> = ({ neighbours }) =>
  neighbours && neighbours.length > 0 ? (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {neighbours.map((neighbour) => (
        <span key={neighbour.coefficient.id}>
          {neighbour.sharingAgreement.name} · Fin {formatEffectEnd(neighbour.validToBefore)} → {formatEffectEnd(neighbour.validToAfter)}
        </span>
      ))}
    </Box>
  ) : (
    <Box component="span" sx={{ color: colors.text.subtle }}>
      Sin cambios
    </Box>
  );

const CoefficientEffects: FC<{
  effects: CoefficientDatesEffectsResponse;
  coefficientValues: Map<string, number>;
  distributorFileSentOn: string | null | undefined;
}> = ({ effects, coefficientValues, distributorFileSentOn }) => {
  const [showAll, setShowAll] = useState(false);
  const bySupply = neighboursBySupply(effects.neighbours);
  const rows = effects.coefficients;
  const shown = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const listedSupplies = new Set(rows.map((row) => row.supply.id));
  const otherNeighbours = effects.neighbours.filter((neighbour) => !listedSupplies.has(neighbour.supply.id));
  const value = (row: CoefficientPeriodChangeResponse) => {
    const coefficient = coefficientValues.get(row.coefficient.id);
    const beta = coefficient === undefined ? "—" : formatBeta(coefficient);
    return row.leavesDistribution ? (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
        <span>{beta}</span>
        <ObservationChip label={LEAVES_AT_ZERO_LABEL} tone="neutral" />
      </Box>
    ) : (
      beta
    );
  };
  const fields = (row: CoefficientPeriodChangeResponse): RecordField[] => [
    { label: "Coeficiente", value: value(row) },
    { label: "Este coeficiente", value: <NewPeriod row={row} distributorFileSentOn={distributorFileSentOn} /> },
    { label: "Coeficiente anterior", value: <NeighbourChanges neighbours={bySupply.get(row.supply.id)} /> },
  ];

  return (
    <Box component="section" aria-labelledby="preview-coefficients">
      <SectionHeading
        headingId="preview-coefficients"
        title="Coeficientes de este acuerdo"
        description="Cada coeficiente se coloca en su orden en el tiempo: el anterior termina cuando empieza este, y este termina cuando empieza el siguiente."
      />
      {rows.length > 0 && (
        <ResponsiveRecordList
          narrow={
            <RecordList
              label="Coeficientes que cambian"
              items={shown.map((row) => ({
                id: row.coefficient.id,
                title: supplyDisplayLabel(row.supply),
                lines: [row.supply.code],
                fields: fields(row),
              }))}
            />
          }
          wide={
            <ListTable<CoefficientPeriodChangeResponse>
              rows={shown}
              getRowKey={(row) => row.coefficient.id}
              isLoading={false}
              title={{
                header: "Punto de suministro",
                text: (row) => supplyDisplayLabel(row.supply),
                secondary: (row) => [row.supply.code],
                width: "24%",
              }}
              columns={[
                { key: "coefficient", header: "Coeficiente", render: value, width: "12%" },
                {
                  key: "period",
                  header: "Este coeficiente",
                  render: (row) => <NewPeriod row={row} distributorFileSentOn={distributorFileSentOn} />,
                  width: "30%",
                },
                {
                  key: "previous",
                  header: "Coeficiente anterior",
                  render: (row) => <NeighbourChanges neighbours={bySupply.get(row.supply.id)} />,
                },
              ]}
            />
          }
          footer={
            rows.length > INITIAL_ROWS && !showAll ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 2, py: 1 }}>
                <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                  Y {rows.length - shown.length} más ·
                </Typography>
                <Button size="small" onClick={() => setShowAll(true)}>
                  Mostrar los {rows.length}
                </Button>
              </Box>
            ) : undefined
          }
        />
      )}
      {otherNeighbours.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Coeficientes anteriores que cambian su fin</Typography>
          {otherNeighbours.map((neighbour) => (
            <Typography key={neighbour.coefficient.id} variant="body2">
              {supplyDisplayLabel(neighbour.supply)} · {neighbour.sharingAgreement.name} · Fin{" "}
              {formatEffectEnd(neighbour.validToBefore)} → {formatEffectEnd(neighbour.validToAfter)}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

/** The day a leaving supply's field holds: the admin's, or the one the dry run closes it on. */
function leavingFieldDay(row: LeavingRow, edit: LeavingDate | undefined): Dayjs | null {
  if (edit) return edit.date;
  return row.closure ? dayjs(localDateAt(row.closure.validToAfter)) : null;
}

const LeavingClosures: FC<{
  rows: LeavingRow[];
  leavingDates: Record<string, LeavingDate>;
  errorsBySupply: Map<string, string[]>;
  readOnly: boolean;
  onChange: (supplyId: string, value: LeavingDate) => void;
}> = ({ rows, leavingDates, errorsBySupply, readOnly, onChange }) => (
  <Box component="section" aria-labelledby="preview-leaving">
    <SectionHeading
      headingId="preview-leaving"
      title={`Salen del reparto (${rows.length})`}
      description="Tienen un coeficiente en otro acuerdo y no están en este. Su coeficiente se cierra en esta fecha."
    />
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {rows.map((row) => {
        const name = supplyDisplayLabel(row.supply);
        const edit = leavingDates[row.supply.id];
        const day = leavingFieldDay(row, edit);
        const isDefault = row.closure?.source === LeavingClosureChangeResponseSource.DEFAULT && edit === undefined;
        const observedDay = row.observed?.observed;
        const editedFromObserved = observedDay !== undefined && isEdited(day, observedDay);
        const invalid = day !== null && edit !== undefined && !isCoefficientDateValid(edit.date, edit.dateError);
        const errors = errorsBySupply.get(row.supply.id) ?? [];
        return (
          <Box
            key={row.supply.id}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 2fr)" },
              gap: { xs: 1, md: 2 },
              alignItems: "start",
              py: 1.5,
              borderTop: `1px solid ${colors.divider}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{name}</Typography>
              <Typography sx={{ fontFamily: fontFamilies.mono, fontSize: fontSizes.sm, color: colors.text.subtle, overflowWrap: "anywhere" }}>
                {row.supply.code}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2">{row.previousAgreementName}</Typography>
              {row.closure && (
                <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                  Fin actual {formatEffectEnd(row.closure.validToBefore)}
                </Typography>
              )}
            </Box>
            <Box sx={{ maxWidth: { md: 260 } }}>
              <DayField
                label={`Fecha de cierre de ${name}`}
                value={day}
                onChange={(date) => onChange(row.supply.id, { date, dateError: edit?.dateError ?? null })}
                onError={(dateError) => onChange(row.supply.id, { date: day, dateError })}
                readOnly={readOnly}
                error={invalid || errors.length > 0}
                helperText={
                  invalid ? "No puede ser una fecha futura" : day === null ? row.observed?.hint : undefined
                }
              />
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5, mt: 0.5 }}>
                {isDefault && (
                  <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 600 }}>
                    {DEFAULT_CLOSURE_LABEL}
                  </Typography>
                )}
                {observedDay !== undefined && !editedFromObserved && !isDefault && <ObservationChip label="Observada" tone="observed" />}
                {observedDay !== undefined && editedFromObserved && (
                  <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                    Editada · la observada es {formatDay(observedDay)}
                  </Typography>
                )}
                {day === null && (
                  <>
                    {row.observed?.hint && <ObservationChip label="Elige una fecha" tone="neutral" />}
                    <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                      Sin fecha de cierre: no se cierra.
                    </Typography>
                  </>
                )}
                {errors.map((message) => (
                  <Typography key={message} variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
                    {message}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  </Box>
);

export interface PreviewStepProps {
  state: PreviewState;
  /** The last dry run that answered, kept while a new one runs or after a refusal. */
  lastEffects: CoefficientDatesEffectsResponse | undefined;
  /** The value of each of the agreement's coefficients, by id. */
  coefficientValues: Map<string, number>;
  namedErrors: NamedRowError[];
  errorsBySupply: Map<string, string[]>;
  leavings: ObservedLeaving[];
  leavingDates: Record<string, LeavingDate>;
  onLeavingDateChange: (supplyId: string, value: LeavingDate) => void;
  distributorFileSentOn: string | null | undefined;
  /** Why "Confirmar y aplicar" is disabled, or null when it may run. */
  confirmBlocker: string | null;
  isConfirming: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onBack: () => void;
  onRetry: () => void;
  onConfirm: () => void;
}

/**
 * Step 2: the dry run's effects, all of them, before anything is written
 * (UI-AGR-034). Each section renders what the response returned and nothing
 * computed from it, except the note on a date before the file was sent, which
 * the response does not carry (UI-AGR-034).
 */
export const PreviewStep: FC<PreviewStepProps> = ({
  state,
  lastEffects,
  coefficientValues,
  namedErrors,
  errorsBySupply,
  leavings,
  leavingDates,
  onLeavingDateChange,
  distributorFileSentOn,
  confirmBlocker,
  isConfirming,
  headingRef,
  onBack,
  onRetry,
  onConfirm,
}) => {
  const effects = state.status === "applied" ? state.effects : undefined;
  const leavingRows = leavingRowsOf(effects ?? (state.status === "loading" ? lastEffects : undefined), leavings);
  const changes = effects ? statusChanges(effects) : [];

  let body: ReactNode;
  if (state.status === "failed") {
    body = <LoadErrorAlert message="No se pudo calcular la vista previa." onRetry={onRetry} />;
  } else if (state.status === "refused") {
    const rowCount = state.rows.length;
    body = (
      <Alert severity="error">
        {rowCount > 0 && (
          <AlertTitle>
            {rowsWithErrors(rowCount)}
          </AlertTitle>
        )}
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {namedErrors.map(({ name, message }) => (
            <li key={`${name ?? ""}${message}`}>
              {name ? (
                <>
                  <strong>{name}:</strong> {message}
                </>
              ) : (
                message
              )}
            </li>
          ))}
        </Box>
        {rowCount > 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {fixRowsHint(rowCount)}
          </Typography>
        )}
      </Alert>
    );
  } else if (effects) {
    body = (
      <>
        <Box sx={{ display: "flex", gap: { xs: 1, md: 2 } }}>
          <SummaryFigure
            value={effects.coefficients.length}
            label={datedCoefficientsLabel(effects.coefficients.length)}
          />
          <SummaryFigure
            value={effects.neighbours.length}
            label={movedEndsLabel(effects.neighbours.length)}
          />
          <SummaryFigure value={leavingSupplyCount(effects)} label={leavingSuppliesLabel(leavingSupplyCount(effects))} />
        </Box>

        {communityStartChanges(effects) && (
          <Notice severity="info">
            {formatCommunityStartChange(effects)} El retorno de la inversión se calculará desde esa fecha.
          </Notice>
        )}

        {changes.length > 0 && (
          <Box component="section" aria-labelledby="preview-statuses">
            <Typography id="preview-statuses" variant="h6" component="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
              Estado de los acuerdos
            </Typography>
            {changes.map((change) => (
              <Typography key={change.sharingAgreement.id}>{formatStatusChange(change)}</Typography>
            ))}
          </Box>
        )}

        <CoefficientEffects effects={effects} coefficientValues={coefficientValues} distributorFileSentOn={distributorFileSentOn} />
      </>
    );
  } else {
    body = (
      <Typography role="status" sx={{ color: colors.text.subtle }}>
        Calculando la vista previa…
      </Typography>
    );
  }

  return (
    <>
      <Box component="section" aria-labelledby="application-dates-step" sx={sxStyles.pageContainer}>
        <Box sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box>
            <Typography
              id="application-dates-step"
              ref={headingRef}
              tabIndex={-1}
              variant="h6"
              component="h2"
              sx={{ fontWeight: 700, "&:focus:not(:focus-visible)": { outline: "none" } }}
            >
              Resumen de cambios
            </Typography>
            <Typography sx={{ mt: 0.5, color: colors.text.secondary }}>
              Revisa todo antes de confirmar. Nada cambia hasta que pulses «Confirmar y aplicar».
            </Typography>
          </Box>
          {body}
          {leavingRows.length > 0 && state.status !== "failed" && (
            <LeavingClosures
              rows={leavingRows}
              leavingDates={leavingDates}
              errorsBySupply={errorsBySupply}
              readOnly={isConfirming}
              onChange={onLeavingDateChange}
            />
          )}
        </Box>
      </Box>

      <FlowActionBar reason={confirmBlocker ?? undefined} reasonId="application-dates-confirm-blocker">
        <Button variant="outlined" onClick={onBack} disabled={isConfirming}>
          Volver a las fechas
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={confirmBlocker !== null || isConfirming}
          aria-describedby={confirmBlocker ? "application-dates-confirm-blocker" : undefined}
        >
          {isConfirming ? "Aplicando…" : "Confirmar y aplicar"}
        </Button>
      </FlowActionBar>
    </>
  );
};

