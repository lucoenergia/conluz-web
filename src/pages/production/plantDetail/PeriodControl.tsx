import type { FC } from "react";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import "dayjs/locale/es";
import { GraphFilterDates } from "../../../components/Graph/GraphFilterDates";
import {
  GraphFilterRangeValues,
  useGraphFilterRange,
  type GrapFilterRange,
} from "../../../components/Graph/useGraphFilterRange";
import { colors, fontSizes, radii, shadows } from "../../../theme/tokens";

const RANGES: { value: GrapFilterRange; label: string }[] = [
  { value: GraphFilterRangeValues.DAY, label: "Día" },
  { value: GraphFilterRangeValues.MONTH, label: "Mes" },
  { value: GraphFilterRangeValues.YEAR, label: "Año" },
  { value: GraphFilterRangeValues.TOTALS, label: "Total" },
  { value: GraphFilterRangeValues.DATES, label: "Fechas" },
];

const PERIOD_FORMAT = { day: "D [de] MMMM [de] YYYY", month: "MMMM [de] YYYY", year: "YYYY" } as const;

/**
 * The period of the plant's production, in the member home's language: a
 * segmented control for the kind of period and a stepper through it. It is
 * presentation only. The period comes from useGraphFilterRange, the same state
 * GraphFilter keeps, and reaches the page through `handleChange` exactly as
 * GraphFilter's does, so the page derives it in one way.
 */
export const PeriodControl: FC<{ handleChange: (startDate: Date, endDate: Date) => void }> = ({ handleChange }) => {
  const state = useGraphFilterRange(handleChange);
  const { range, setRange, startDate, stepUnit, step, canStepForward } = state;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ToggleButtonGroup
        exclusive
        value={range}
        onChange={(_, value: GrapFilterRange | null) => value && setRange(value)}
        aria-label="Periodo"
        fullWidth
        sx={{
          bgcolor: colors.background.surface,
          borderRadius: radii.default,
          p: 0.5,
          gap: 0.5,
          "& .MuiToggleButton-root": {
            minHeight: 44,
            border: "none",
            borderRadius: `${radii.default} !important`,
            textTransform: "none",
            fontSize: fontSizes.md,
            fontWeight: 600,
            color: colors.text.secondary,
          },
          "& .MuiToggleButton-root.Mui-selected": {
            bgcolor: colors.background.paper,
            color: colors.brand.main,
            boxShadow: shadows.medium,
          },
        }}
      >
        {RANGES.map(({ value, label }) => (
          <ToggleButton key={value} value={value}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {stepUnit && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <IconButton aria-label="Periodo anterior" onClick={() => step(-1)} sx={{ width: 44, height: 44 }}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Typography
            component="p"
            aria-live="polite"
            sx={{ fontWeight: 600, color: colors.text.primary, textAlign: "center", "&::first-letter": { textTransform: "uppercase" } }}
          >
            {startDate.locale("es").format(PERIOD_FORMAT[stepUnit])}
          </Typography>
          <IconButton
            aria-label="Periodo siguiente"
            onClick={() => step(1)}
            disabled={!canStepForward}
            sx={{ width: 44, height: 44 }}
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>
      )}

      {range === GraphFilterRangeValues.DATES && (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
          <GraphFilterDates state={state} />
        </Box>
      )}
    </Box>
  );
};
