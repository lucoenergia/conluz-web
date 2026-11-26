import { useId, type FC, type ReactNode } from "react";
import { Box, Link, MenuItem, TextField, Typography } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import type { PlantSurplusClaimResponse } from "../../../api/models";
import { PlantSection } from "../../../components/PlantSection";
import { Swatch } from "../../../components/EnergyFigures/Swatch";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { SURPLUS_CLAIM_CLOSED_MONTHS_MESSAGE } from "../../../errors/surplusClaim";
import { formatEuros, formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { colors, radii } from "../../../theme/tokens";
import { monthLabel, monthPhrase, warningCountText } from "./surplusClaimFormat";

/** What a figure reads when the month has none: never 0, which would be a measured amount. */
export const NO_FIGURE = "—";

const INCOME_NOTE =
  "Estimación a precio de mercado (OMIE) del excedente de este fichero. Lo que pague la comercializadora puede ser distinto.";

export interface ClaimMonthFieldProps {
  /** The month asked for, which may still be loading. */
  selectedMonth: string;
  monthOptions: readonly string[];
  onMonthChange: (month: string) => void;
}

/** "Mes": first in the summary's control row. */
export const ClaimMonthField: FC<ClaimMonthFieldProps> = ({ selectedMonth, monthOptions, onMonthChange }) => (
  <TextField
    select
    size="small"
    label="Mes"
    value={selectedMonth}
    onChange={(event) => onMonthChange(event.target.value)}
    helperText={SURPLUS_CLAIM_CLOSED_MONTHS_MESSAGE}
    sx={(theme) => ({ width: { xs: "100%", sm: theme.spacing(35) } })}
  >
    {monthOptions.map((month) => (
      <MenuItem key={month} value={month}>
        {monthLabel(month)}
      </MenuItem>
    ))}
  </TextField>
);

/**
 * The rows the two blocks share from `sm` up, through a subgrid: the heading,
 * the labels, the figures and the line under them, so the labels and the
 * figures of both blocks align.
 */
const ROW = { heading: 1, label: 2, figure: 3, note: 4 } as const;

interface Figure {
  label: ReactNode;
  value: string;
}

interface FigureBlockProps {
  heading: string;
  figures: [Figure, Figure];
  /** The first block's figures are the largest. */
  emphasis: "primary" | "secondary";
  /** Below `sm`, one figure under the other rather than side by side. */
  stackBelowSm?: boolean;
  note?: ReactNode;
}

/** One block of the summary: a short heading, two figures side by side, and a line spanning the block. */
const FigureBlock: FC<FigureBlockProps> = ({ heading, figures, emphasis, stackBelowSm = false, note }) => {
  const headingId = useId();
  // A stacked block keeps the document order below sm: label, figure, label, figure.
  const placed = (row: number, column: number) =>
    stackBelowSm ? { gridRow: { sm: row }, gridColumn: { sm: column } } : { gridRow: row, gridColumn: column };

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: stackBelowSm ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))", sm: "repeat(2, auto)" },
        gridRow: { sm: "1 / span 4" },
        gridTemplateRows: { sm: "subgrid" },
        columnGap: { xs: 2, sm: 6 },
        rowGap: 0.5,
        alignItems: "baseline",
        p: { xs: 2, sm: 2.5 },
        border: `1px solid ${colors.border.light}`,
        borderRadius: radii.default,
        minWidth: 0,
      }}
    >
      <Typography
        id={headingId}
        component="h3"
        variant="subtitle2"
        sx={{ gridColumn: "1 / -1", gridRow: { sm: ROW.heading }, mb: 1, fontWeight: 600, color: colors.text.primary }}
      >
        {heading}
      </Typography>
      {figures.map((figure, index) => [
        <Typography
          key={`label-${index}`}
          component="span"
          variant="body2"
          sx={[{ display: "flex", alignItems: "center", gap: 1, color: colors.text.secondary }, placed(ROW.label, index + 1)]}
        >
          {figure.label}
        </Typography>,
        <Typography
          key={`figure-${index}`}
          component="span"
          variant={emphasis === "primary" ? "h4" : "h5"}
          sx={[
            {
              fontWeight: emphasis === "primary" ? 700 : 600,
              color: colors.text.primary,
              fontVariantNumeric: "tabular-nums",
              mb: stackBelowSm && index === 0 ? { xs: 1.5, sm: 0 } : 0,
            },
            placed(ROW.figure, index + 1),
          ]}
        >
          {figure.value}
        </Typography>,
      ])}
      {/* The line wraps to the block's width rather than setting it, so the figures size the block. */}
      {note && (
        <Box
          sx={{
            gridColumn: "1 / -1",
            gridRow: { sm: ROW.note },
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            mt: 1,
            contain: "inline-size",
          }}
        >
          {note}
        </Box>
      )}
    </Box>
  );
};

const Note: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography variant="body2" sx={{ color: colors.text.subtle }}>
    {children}
  </Typography>
);

export interface SurplusClaimSummaryProps {
  claim: PlantSurplusClaimResponse;
  warningCount: number;
  onShowWarnings: () => void;
  /** The control row: the month, the format and the download. */
  controls: ReactNode;
}

/**
 * The top of the page, grouped by meaning: the control row with everything
 * the admin does here, then what is claimed, then how good its data is with
 * the warning count, all before the warnings themselves (UI-SCL-003).
 */
export const SurplusClaimSummary: FC<SurplusClaimSummaryProps> = ({ claim, warningCount, onShowWarnings, controls }) => {
  const { summary } = claim;
  const income = summary.surplusIncome;

  return (
    <PlantSection
      title={`Resumen de ${monthPhrase(claim.month)}`}
      description="Lo que entra en el fichero de este mes."
      icon={BarChartRoundedIcon}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 2 }}>
        {controls}

        {/* Side by side from sm up, each as wide as its content, never stretched; stacked below. */}
        <Box
          sx={{
            display: { xs: "flex", sm: "grid" },
            flexDirection: "column",
            gap: 1.5,
            gridTemplateColumns: { sm: "repeat(2, auto)" },
            gridTemplateRows: { sm: "repeat(4, auto)" },
            columnGap: { sm: 2 },
            justifyContent: { sm: "start" },
          }}
        >
          <FigureBlock
            heading="Lo que reclamas"
            emphasis="primary"
            stackBelowSm
            figures={[
              {
                label: (
                  <>
                    <Swatch bgcolor={ENERGY_COLORS.exported} />
                    Excedentes del mes
                  </>
                ),
                value: summary.surplusKWh === null ? NO_FIGURE : formatKilowattHours(summary.surplusKWh),
              },
              // A negative amount keeps its sign and no alert colour: market prices may be negative.
              { label: "Importe estimado", value: income === null ? NO_FIGURE : formatEuros(income.amountEur) },
            ]}
            note={
              <>
                <Note>{INCOME_NOTE}</Note>
                {income !== null && income.unpricedSurplusKWh > 0 && (
                  <Note>{`${formatKilowattHours(income.unpricedSurplusKWh)} sin precio de mercado: no cuentan en el importe.`}</Note>
                )}
              </>
            }
          />
          <FigureBlock
            heading="Calidad de los datos"
            emphasis="secondary"
            figures={[
              { label: "Días reales", value: `${summary.realDays} de ${claim.days.length}` },
              {
                label: "Puntos con datos",
                value:
                  summary.suppliesInScope === 0 ? "Ninguno" : `${summary.suppliesWithData} de ${summary.suppliesInScope}`,
              },
            ]}
            note={
              warningCount > 0 && (
                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    m: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: radii.default,
                    bgcolor: colors.warning.surface,
                    color: colors.warning.dark,
                  }}
                >
                  <WarningAmberRoundedIcon aria-hidden fontSize="small" />
                  <span>
                    {`${warningCountText(warningCount)} · `}
                    <Link
                      href="#avisos-del-mes"
                      onClick={(event) => {
                        event.preventDefault();
                        onShowWarnings();
                      }}
                      sx={{ color: "inherit", fontWeight: 600 }}
                    >
                      Ver avisos
                    </Link>
                  </span>
                </Typography>
              )
            }
          />
        </Box>
      </Box>
    </PlantSection>
  );
};
