import { useMemo, type FC, type ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert/LoadErrorAlert";
import { NeutralNotice } from "../../../components/EnergyFigures/NeutralNotice";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { PlantInverterProductionTodayResponseStatus, type PlantInverterProductionTodayResponse } from "../../../api/models";
import { colors, radii } from "../../../theme/tokens";
import { formatTimeOfDay } from "../../../utils/formatCalendarDate";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { formatKilowatts } from "../../../utils/formatKilowatts";
import { PlantSection } from "./PlantSection";
import { TODAY_ICON } from "./sectionIcons";
import { axisTime, gapsPhrase, inverterCurve, type InverterCurve } from "./inverterCurve";
import { InverterTodayChart } from "./InverterTodayChart";
import {
  GAP_LABEL,
  NOT_STARTED,
  NO_DATA_TODAY_BODY,
  NO_DATA_TODAY_TITLE,
  NOW_LABEL,
  POWER_SERIES,
  TODAY_DESCRIPTION,
  TODAY_LOAD_ERROR,
  TODAY_TITLE,
  figureLabel,
  gapText,
  staleText,
  updatedText,
} from "./inverterTodayTexts";
import { useInverterToday } from "./useInverterToday";

/**
 * "Hoy, según el inversor" (UI-PLT-012): what the plant's inverter produced
 * today, apart from the distributor's figures and never summed with them.
 * Rendered only when the plant has an enabled inverter integration: nothing
 * while the answer is unknown, or when it is NOT_AVAILABLE.
 */
export const PlantInverterToday: FC<{ plantId: string }> = ({ plantId }) => {
  const query = useInverterToday(plantId);
  const today = query.data;

  // A failed refetch keeps the last answer on screen: the stale state says how old it is.
  if (!today) {
    if (!query.isError) return null;
    return (
      <PlantSection title={TODAY_TITLE} description={TODAY_DESCRIPTION} icon={TODAY_ICON}>
        <Box sx={{ mt: 2 }}>
          <LoadErrorAlert message={TODAY_LOAD_ERROR} onRetry={() => void query.refetch()} />
        </Box>
      </PlantSection>
    );
  }
  if (today.status === PlantInverterProductionTodayResponseStatus.NOT_AVAILABLE) return null;

  return (
    <PlantSection title={TODAY_TITLE} description={TODAY_DESCRIPTION} icon={TODAY_ICON}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        {today.status === PlantInverterProductionTodayResponseStatus.NO_DATA_TODAY ? (
          <NeutralNotice title={NO_DATA_TODAY_TITLE}>{NO_DATA_TODAY_BODY}</NeutralNotice>
        ) : (
          <AvailableToday today={today} />
        )}
      </Box>
    </PlantSection>
  );
};

/** A swatch beside a figure or a legend entry: gold is only ever a mark, never text (UI-PLT-013). */
const Swatch: FC<{ bgcolor: string; border?: string; line?: boolean }> = ({ bgcolor, border, line = false }) => (
  <Box
    aria-hidden
    sx={{ width: line ? 2 : 12, height: 12, borderRadius: line ? 0 : radii.small, bgcolor, border, flexShrink: 0 }}
  />
);

const AvailableToday: FC<{ today: PlantInverterProductionTodayResponse }> = ({ today }) => {
  // Read at every render: each refetch moves the "Ahora" mark along.
  const now = Date.now();
  const curve = useMemo(() => inverterCurve(today.powerCurve ?? [], now), [today, now]);
  const lastUpdated = today.lastUpdatedAt ? formatTimeOfDay(today.lastUpdatedAt) : null;
  const energy = today.todayEnergyKWh ?? 0;
  const stale = today.stale === true;

  return (
    <>
      <Box role="group" aria-label={lastUpdated ? figureLabel(lastUpdated) : TODAY_TITLE} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Swatch bgcolor={ENERGY_COLORS.assigned} />
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            {lastUpdated ? figureLabel(lastUpdated) : "Hoy"}
          </Typography>
        </Box>
        <Typography variant="h4" component="p" sx={{ color: colors.text.primary, fontWeight: 700 }}>
          {formatKilowattHours(energy)}
        </Typography>
      </Box>

      {energy === 0 && <NeutralNotice>{NOT_STARTED}</NeutralNotice>}
      {stale && lastUpdated && <NeutralNotice>{staleText(lastUpdated)}</NeutralNotice>}
      {curve.gaps.length > 0 && <NeutralNotice>{gapText(gapsPhrase(curve.gaps, curve.dayEnd), curve.gaps.length > 1)}</NeutralNotice>}

      <Box component="ul" aria-label="Leyenda" sx={{ display: "flex", flexWrap: "wrap", gap: 2, listStyle: "none", m: 0, p: 0 }}>
        <LegendEntry swatch={<Swatch bgcolor={ENERGY_COLORS.assigned} />} label={`${POWER_SERIES} (kW)`} />
        <LegendEntry swatch={<Swatch bgcolor={colors.brand.main} line />} label={NOW_LABEL} />
        {curve.gaps.length > 0 && (
          <LegendEntry swatch={<Swatch bgcolor={colors.background.surface} border={`1px solid ${colors.border.light}`} />} label={GAP_LABEL} />
        )}
      </Box>

      <InverterTodayChart curve={curve} description={curveDescription(curve)} />

      {!stale && lastUpdated && (
        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
          {updatedText(lastUpdated)}
        </Typography>
      )}
    </>
  );
};

const LegendEntry: FC<{ swatch: ReactNode; label: string }> = ({ swatch, label }) => (
  <Box component="li" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
    {swatch}
    <Typography variant="caption" sx={{ color: colors.text.primary }}>
      {label}
    </Typography>
  </Box>
);

/** What the curve shows, for a reader who cannot see it. */
function curveDescription(curve: InverterCurve): string {
  const until = axisTime(curve.now, curve.dayEnd);
  const measured = curve.points.filter((point): point is [number, number] => point[1] !== null);
  const peak = measured.reduce<[number, number] | null>((best, point) => (best === null || point[1] > best[1] ? point : best), null);
  const parts = [`Potencia del inversor hoy, de 00:00 a las ${until}.`];
  if (peak && peak[1] > 0) parts.push(`Máximo ${formatKilowatts(peak[1])} a las ${axisTime(peak[0], curve.dayEnd)}.`);
  if (curve.gaps.length > 0) parts.push(`Sin datos ${gapsPhrase(curve.gaps, curve.dayEnd)}.`);
  return parts.join(" ");
}
