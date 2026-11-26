import type { FC, ReactNode } from "react";
import { Box, Link, MenuItem, TextField, Typography } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import type { PlantSurplusClaimResponse } from "../../../api/models";
import { PlantSection } from "../../../components/PlantSection";
import { Swatch } from "../../../components/EnergyFigures/Swatch";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { formatEuros, formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { colors, radii } from "../../../theme/tokens";
import { sxStyles } from "../../../theme/sx";
import { SURPLUS_CLAIM_CLOSED_MONTHS_MESSAGE } from "../../../errors/surplusClaim";
import { monthLabel, monthPhrase, warningCountText } from "./surplusClaimFormat";

/** What a figure reads when the month has none: never 0, which would be a measured amount. */
export const NO_FIGURE = "—";


const INCOME_NOTE =
  "Estimación a precio de mercado (OMIE) del excedente de este fichero. Lo que pague la comercializadora puede ser distinto.";

const Figure: FC<{ label: ReactNode; value: string; children?: ReactNode }> = ({ label, value, children }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
    <Typography component="span" variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, color: colors.text.secondary }}>
      {label}
    </Typography>
    <Typography component="span" variant="h6" sx={{ fontWeight: 700, color: colors.text.primary, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </Typography>
    {children}
  </Box>
);

const Note: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography variant="body2" sx={{ color: colors.text.subtle }}>
    {children}
  </Typography>
);

export interface SurplusClaimSummaryProps {
  claim: PlantSurplusClaimResponse;
  /** The month in the selector: the one asked for, which may still be loading. */
  selectedMonth: string;
  monthOptions: readonly string[];
  onMonthChange: (month: string) => void;
  warningCount: number;
  onShowWarnings: () => void;
  /** The format and the download, last in the summary. */
  actions?: ReactNode;
}

/**
 * The top of the page: everything the admin does here, with the figures of
 * the month and how many warnings it raises, before the warnings themselves
 * (UI-SCL-003).
 */
export const SurplusClaimSummary: FC<SurplusClaimSummaryProps> = ({
  claim,
  selectedMonth,
  monthOptions,
  onMonthChange,
  warningCount,
  onShowWarnings,
  actions,
}) => {
  const { summary } = claim;
  const income = summary.surplusIncome;

  return (
    <PlantSection
      title={`Resumen de ${monthPhrase(claim.month)}`}
      description="Lo que entra en el fichero de este mes."
      icon={BarChartRoundedIcon}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 2 }}>
        <TextField
          select
          label="Mes"
          value={selectedMonth}
          onChange={(event) => onMonthChange(event.target.value)}
          helperText={SURPLUS_CLAIM_CLOSED_MONTHS_MESSAGE}
          sx={{ ...sxStyles.filterField, width: { xs: "100%", sm: 320 } }}
        >
          {monthOptions.map((month) => (
            <MenuItem key={month} value={month}>
              {monthLabel(month)}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 2.5, sm: 3 } }}>
          <Figure
            label={
              <>
                <Swatch bgcolor={ENERGY_COLORS.exported} />
                Excedentes del mes
              </>
            }
            value={summary.surplusKWh === null ? NO_FIGURE : formatKilowattHours(summary.surplusKWh)}
          />
          {/* A negative amount keeps its sign and no alert colour: market prices may be negative. */}
          <Figure label="Importe estimado" value={income === null ? NO_FIGURE : formatEuros(income.amountEur)}>
            <Note>{INCOME_NOTE}</Note>
            {income !== null && income.unpricedSurplusKWh > 0 && (
              <Note>{`${formatKilowattHours(income.unpricedSurplusKWh)} sin precio de mercado: no cuentan en el importe.`}</Note>
            )}
          </Figure>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 2, sm: 3 } }}>
          <Figure label="Días con datos reales" value={String(summary.realDays)} />
          <Figure label="Días estimados" value={String(summary.estimatedDays)} />
          <Figure
            label="Puntos de suministro incluidos"
            value={summary.suppliesInScope === 0 ? "Ninguno" : `${summary.suppliesWithData} de ${summary.suppliesInScope}`}
          />
        </Box>

        {warningCount > 0 && (
          <Typography
            component="p"
            variant="body2"
            sx={{
              m: 0,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
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
        )}

        {actions}
      </Box>
    </PlantSection>
  );
};
