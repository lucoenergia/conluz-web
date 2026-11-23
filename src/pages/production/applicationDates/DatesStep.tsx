import { useState, type FC, type Ref } from "react";
import { Box, Button, Checkbox, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import type { Dayjs } from "dayjs";
import { Notice } from "../../../components/Notice";
import { sxStyles } from "../../../theme/sx";
import { colors, fontFamilies, fontSizes } from "../../../theme/tokens";
import { datesToChoose, moreRows, selectedOfTotal } from "./applicationDatesCopy";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { isCoefficientDateValid } from "../coefficientDateValidation";
import { ObservationChip } from "../observedSharing/ObservationChip";
import { formatBeta, formatDay, joinNames } from "../observedSharing/observedSharingFormat";
import { DayField, FlowActionBar } from "./ApplicationDatesParts";
import { isEdited, withSelection, type CoefficientDateRow, type ObservedLeaving } from "./applicationDatesRows";

/** How many rows show before "Mostrar todos". */
const INITIAL_ROWS = 10;

const ROW_GRID = {
  display: "grid",
  columnGap: 1.5,
  rowGap: 1,
  alignItems: "center",
  gridTemplateColumns: { xs: "auto minmax(0, 1fr) auto", md: "48px minmax(0, 1.5fr) 110px 120px minmax(0, 2fr)" },
  gridTemplateAreas: {
    xs: `"check supply coefficient" ". current current" ". date date"`,
    md: `"check supply coefficient current date"`,
  },
} as const;

/** The explanation the observed sharing page gives a proposed date (UI-AGR-027). */
export const PROPOSED_DATE_EXPLANATION =
  "Propuesta: es la fecha de aplicación más frecuente entre los demás puntos de este acuerdo.";

const REFERENCE_LABEL = { observed: "Observada", proposed: "Propuesta" } as const;

/**
 * Under a field: where its day came from while it holds that day, the day it
 * was prefilled with once edited, and the observed range or open date it
 * still needs a day for (UI-AGR-032).
 */
const DateNotes: FC<{ row: CoefficientDateRow; errors: string[] }> = ({ row, errors }) => {
  const edited = isEdited(row.date, row.reference?.date);
  // An unmarked dated row holds no day: its reason says what was observed.
  const reference = row.selected || row.date !== null ? row.reference : undefined;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5, mt: 0.5 }}>
      {reference && !edited && (
        <>
          <ObservationChip label={REFERENCE_LABEL[reference.kind]} tone={reference.kind} />
          {reference.kind === "proposed" && (
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              {PROPOSED_DATE_EXPLANATION}
            </Typography>
          )}
        </>
      )}
      {reference && edited && (
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          Editada · la {reference.kind === "observed" ? "observada" : "propuesta"} es {formatDay(reference.date)}
        </Typography>
      )}
      {row.hint && row.date === null && <ObservationChip label="Elige una fecha" tone="neutral" />}
      {errors.map((message) => (
        <Typography key={message} variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {message}
        </Typography>
      ))}
    </Box>
  );
};

/** What the field says below itself: why it is off, why its day is refused, or what to choose from. */
function helperTextOf(row: CoefficientDateRow): string | undefined {
  if (!row.selected) return row.unselectedReason;
  if (row.date !== null && !isCoefficientDateValid(row.date, row.dateError)) {
    return row.dateError === "maxDate" || row.dateError === "disableFuture" ? "No puede ser una fecha futura" : "Fecha no válida";
  }
  if (row.hint) return row.hint;
  if (row.noData && row.date === null) return "Sin datos de Datadis: escribe la fecha";
  return undefined;
}

const DateRow: FC<{
  row: CoefficientDateRow;
  errors: string[];
  readOnly: boolean;
  onChange: (patch: Partial<CoefficientDateRow>) => void;
}> = ({ row, errors, readOnly, onChange }) => {
  const name = supplyDisplayLabel(row.supply);
  const invalid = row.selected && row.date !== null && !isCoefficientDateValid(row.date, row.dateError);
  return (
    <Box sx={{ ...ROW_GRID, px: { xs: 0, md: 2 }, py: 1.25, borderTop: `1px solid ${colors.divider}` }}>
      <Box sx={{ gridArea: "check", alignSelf: { xs: "start", md: "center" } }}>
        <Checkbox
          size="small"
          checked={row.selected}
          disabled={readOnly}
          onChange={(event) => onChange(withSelection(row, event.target.checked))}
          inputProps={{ "aria-label": `Seleccionar ${name}` }}
        />
      </Box>
      <Box sx={{ gridArea: "supply", minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSizes.lg, fontWeight: 600, color: colors.text.primary, overflowWrap: "anywhere" }}>
          {name}
        </Typography>
        <Typography sx={{ fontFamily: fontFamilies.mono, fontSize: fontSizes.sm, color: colors.text.subtle, overflowWrap: "anywhere" }}>
          {row.supply.code}
        </Typography>
      </Box>
      <Typography
        sx={{ gridArea: "coefficient", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", alignSelf: { xs: "start", md: "center" } }}
      >
        {formatBeta(row.coefficient)}
      </Typography>
      <Typography variant="body2" sx={{ gridArea: "current", color: colors.text.subtle }}>
        <Box component="span" sx={{ display: { md: "none" } }}>
          Fecha actual:{" "}
        </Box>
        {row.storedDate ? formatDay(row.storedDate) : "Sin fecha"}
      </Typography>
      <Box sx={{ gridArea: "date", minWidth: 0, maxWidth: { md: 240 } }}>
        <DayField
          label={`Nueva fecha de inicio de ${name}`}
          value={row.date}
          onChange={(date: Dayjs | null) => onChange({ date })}
          onError={(dateError) => onChange({ dateError })}
          disabled={!row.selected}
          readOnly={readOnly}
          helperText={helperTextOf(row)}
          error={invalid || errors.length > 0}
        />
        <DateNotes row={row} errors={errors} />
      </Box>
    </Box>
  );
};

export interface DatesStepProps {
  rows: CoefficientDateRow[];
  onRowsChange: (rows: CoefficientDateRow[]) => void;
  /** Opened from observed sharing: the dates come from it. */
  fromObserved: boolean;
  /** The supplies observed sharing saw leave with this agreement. */
  leavings: ObservedLeaving[];
  observationPath: string;
  /** Backend refusals of the last request, by coefficient id. */
  rowErrors: Map<string, string[]>;
  blocker: string | null;
  headingRef: Ref<HTMLHeadingElement>;
  onPreview: () => void;
  onCancel: () => void;
}

/** Step 1: which coefficients get a date, and which (UI-AGR-032, UI-AGR-033). */
export const DatesStep: FC<DatesStepProps> = ({
  rows,
  onRowsChange,
  fromObserved,
  leavings,
  observationPath,
  rowErrors,
  blocker,
  headingRef,
  onPreview,
  onCancel,
}) => {
  const [showAll, setShowAll] = useState(rows.length <= INITIAL_ROWS);
  const [sameDate, setSameDate] = useState<Dayjs | null>(null);
  const [sameDateError, setSameDateError] = useState<string | null>(null);

  const shown = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const selectedCount = rows.filter((row) => row.selected).length;
  const toChoose = rows.filter((row) => row.hint !== undefined).length;

  const patchRow = (coefficientId: string, patch: Partial<CoefficientDateRow>) =>
    onRowsChange(rows.map((row) => (row.coefficientId === coefficientId ? { ...row, ...patch } : row)));

  const selectAll = (selected: boolean) => onRowsChange(rows.map((row) => withSelection(row, selected)));

  const applySameDate = () => {
    if (!sameDate || !isCoefficientDateValid(sameDate, sameDateError)) return;
    onRowsChange(rows.map((row) => (row.selected ? { ...row, date: sameDate, dateError: null } : row)));
  };

  return (
    <>
      <Box component="section" aria-labelledby="application-dates-step" sx={sxStyles.pageContainer}>
        <Box sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography
              id="application-dates-step"
              ref={headingRef}
              tabIndex={-1}
              variant="h6"
              component="h2"
              sx={{ fontWeight: 700, "&:focus:not(:focus-visible)": { outline: "none" } }}
            >
              Fechas de inicio
            </Typography>
            <Typography sx={{ mt: 0.5, color: colors.text.secondary, textWrap: "pretty" }}>
              Desde qué día empieza a contar el coeficiente de cada punto. No se admiten fechas futuras. Desmarca los puntos
              que quieras dejar sin cambios.
            </Typography>
          </Box>

          {fromObserved ? (
            <Notice severity="info">
              Fechas desde el{" "}
              <Link component={RouterLink} to={observationPath}>
                reparto observado
              </Link>
              . «Observada»: Datadis muestra ese día el coeficiente registrado. «Propuesta»: el coeficiente es el mismo que en
              el acuerdo anterior y el cambio no se puede observar. Revísalas, tú decides.
              {toChoose > 0 &&
                ` ${datesToChoose(toChoose)}`}
            </Notice>
          ) : (
            <Notice severity="info">
              Escribe desde qué día recibe cada punto su coeficiente. ¿No sabes las fechas?{" "}
              <Link component={RouterLink} to={observationPath}>
                El reparto observado
              </Link>{" "}
              las calcula con los datos de Datadis.
            </Notice>
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "center" },
              gap: 1.5,
              bgcolor: colors.background.surface,
              borderRadius: 1,
              px: 2,
              py: 1.5,
            }}
          >
            <Box sx={{ width: { xs: "100%", md: 240 } }}>
              <DayField
                label="Misma fecha para todos"
                visibleLabel
                value={sameDate}
                onChange={setSameDate}
                onError={setSameDateError}
              />
            </Box>
            <Button
              variant="outlined"
              onClick={applySameDate}
              disabled={!sameDate || !isCoefficientDateValid(sameDate, sameDateError) || selectedCount === 0}
            >
              Aplicar la misma fecha a todos
            </Button>
            <Typography variant="body2" sx={{ color: colors.text.subtle, ml: { md: "auto" } }}>
              {selectedOfTotal(selectedCount, rows.length)}
            </Typography>
          </Box>

          <Box sx={{ border: { md: `1px solid ${colors.divider}` }, borderRadius: { md: 1 }, overflow: "hidden" }}>
            <Box
              sx={{
                ...ROW_GRID,
                display: { xs: "none", md: "grid" },
                px: 2,
                py: 0.5,
                bgcolor: colors.background.surface,
                fontWeight: 600,
                color: colors.text.secondary,
              }}
            >
              <Box sx={{ gridArea: "check" }}>
                <Checkbox
                  size="small"
                  checked={selectedCount === rows.length && rows.length > 0}
                  indeterminate={selectedCount > 0 && selectedCount < rows.length}
                  onChange={(event) => selectAll(event.target.checked)}
                  inputProps={{ "aria-label": "Seleccionar todos los puntos" }}
                />
              </Box>
              <Typography variant="body2" sx={{ gridArea: "supply", fontWeight: 600 }}>
                Punto de suministro
              </Typography>
              <Typography variant="body2" sx={{ gridArea: "coefficient", fontWeight: 600, textAlign: "right" }}>
                Coeficiente
              </Typography>
              <Typography variant="body2" sx={{ gridArea: "current", fontWeight: 600 }}>
                Fecha actual
              </Typography>
              <Typography variant="body2" sx={{ gridArea: "date", fontWeight: 600 }}>
                Nueva fecha de inicio
              </Typography>
            </Box>
            {shown.map((row) => (
              <DateRow
                key={row.coefficientId}
                row={row}
                errors={rowErrors.get(row.coefficientId) ?? []}
                readOnly={false}
                onChange={(patch) => patchRow(row.coefficientId, patch)}
              />
            ))}
            {!showAll && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: { xs: 0, md: 2 }, py: 1, borderTop: `1px solid ${colors.divider}` }}>
                <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                  {moreRows(rows.length - shown.length)} ·
                </Typography>
                <Button size="small" onClick={() => setShowAll(true)}>
                  Mostrar todos
                </Button>
              </Box>
            )}
          </Box>

          {leavings.length > 0 && (
            <Notice severity="info">
              {leavings.length === 1 ? (
                <>
                  <strong>{supplyDisplayLabel(leavings[0].supply)} sale del reparto:</strong> estaba en{" "}
                  {leavings[0].previousAgreementName} y no está en este acuerdo. Revisarás su fecha de cierre en la vista
                  previa.
                </>
              ) : (
                <>
                  <strong>{joinNames(leavings.map((leaving) => supplyDisplayLabel(leaving.supply)))} salen del reparto:</strong>{" "}
                  estaban en un acuerdo anterior y no están en este. Revisarás sus fechas de cierre en la vista previa.
                </>
              )}
            </Notice>
          )}
        </Box>
      </Box>

      <FlowActionBar reason={blocker ?? undefined} reasonId="application-dates-blocker">
        <Button variant="outlined" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onPreview}
          disabled={blocker !== null}
          aria-describedby={blocker ? "application-dates-blocker" : undefined}
        >
          Ver vista previa
        </Button>
      </FlowActionBar>
    </>
  );
};
