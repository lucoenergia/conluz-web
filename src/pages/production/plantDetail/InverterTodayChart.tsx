import { useMemo, type FC } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import Chart from "react-apexcharts";
import type { InverterCurve } from "./inverterCurve";
import { inverterChartOptions } from "./inverterChartOptions";
import { POWER_SERIES } from "./inverterTodayTexts";

/**
 * Today's power curve, as a line and area over the whole local day. It stays
 * horizontal and full width on a phone, with no sideways scroll.
 */
export const InverterTodayChart: FC<{ curve: InverterCurve; description: string }> = ({ curve, description }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("sm"));
  const options = useMemo(() => inverterChartOptions(curve, wide), [curve, wide]);
  const series = useMemo(() => [{ name: POWER_SERIES, data: curve.points }], [curve]);
  return (
    <Box role="img" aria-label={description} sx={{ width: "100%", minWidth: 0 }}>
      <Chart type="area" height={wide ? 190 : 150} width="100%" options={options} series={series} />
    </Box>
  );
};
