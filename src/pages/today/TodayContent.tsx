import { useMemo, type FC } from "react";
import { Box, Link, Skeleton, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { SupplyResponse } from "../../api/models";
import { PlantSection } from "../../components/PlantSection";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { LegendEntry } from "../../components/EnergyFigures/LegendEntry";
import { Swatch } from "../../components/EnergyFigures/Swatch";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { Stat } from "../../components/Stat/Stat";
import { LoadingStat } from "../../components/Stat/LoadingStat";
import { sxStyles } from "../../theme/sx";
import { colors, fontSizes, radii, shadows } from "../../theme/tokens";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { InverterTodayChart } from "../production/plantDetail/InverterTodayChart";
import { axisTime, gapsPhrase, inverterCurve, type InverterCurve } from "../production/plantDetail/inverterCurve";
import { GAP_LABEL, NOW_LABEL } from "../production/plantDetail/inverterTodayTexts";
import { EnergyFlowHero } from "./EnergyFlowHero";
import { todayView, type AvailableView, type WithoutDataView } from "./todayState";
import {
  CONTACT_LINK,
  CURRENT_FIGURE,
  CURVE_DESCRIPTION,
  CURVE_SERIES,
  CURVE_TITLE,
  ENERGY_FIGURE,
  LOAD_ERROR,
  NOW_DESCRIPTION,
  NOW_TITLE,
  freshnessText,
} from "./todayTexts";
import { useSupplyEnergyToday } from "./useSupplyEnergyToday";

/** Full-bleed on a phone, a raised card from sm (the design's layout at 380 and 1024 px). */
const CARD_SX = {
  borderRadius: { xs: 0, sm: radii.large },
  boxShadow: { xs: "none", sm: shadows.soft },
} as const;

/** From 640 px of card interior, the hero and the figures sit side by side. */
const WIDE_CARD = "@container (min-width: 640px)";

/**
 * Today's energy for one supply (UI-TDY-004): skeletons on the first load
 * only, an error with a retry when nothing has arrived yet, and the designed
 * state for each answer. A poll that fails later keeps the last answer on
 * screen; the stale notice says how old it is.
 */
export const TodayContent: FC<{ supply: SupplyResponse }> = ({ supply }) => {
  const query = useSupplyEnergyToday(supply.id);
  const production = query.data?.production;

  if (!production) {
    if (query.isError)
      return (
        <Box sx={sxStyles.pageContainer}>
          <LoadErrorAlert message={LOAD_ERROR} onRetry={() => void query.refetch()} />
        </Box>
      );
    return <TodayLoading />;
  }

  const view = todayView(production);
  if (view.kind === "withoutData") return <WithoutData view={view} supplyLabel={supplyDisplayLabel(supply)} />;
  return (
    <AvailableToday view={view} supplyLabel={supplyDisplayLabel(supply)} curvePoints={production.assignedPowerCurve ?? []} />
  );
};

const TodayLoading: FC = () => (
  <>
    <PlantSection title={NOW_TITLE} description={NOW_DESCRIPTION} icon={BoltRoundedIcon} sx={CARD_SX}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-start" }}>
        <Skeleton variant="rounded" sx={{ width: "100%", maxWidth: 360, aspectRatio: "340 / 316", height: "auto" }} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <LoadingStat variant="big" label={CURRENT_FIGURE} />
          <LoadingStat variant="big" label={ENERGY_FIGURE} />
        </Box>
      </Box>
    </PlantSection>
    <PlantSection title={CURVE_TITLE} description={CURVE_DESCRIPTION} icon={ShowChartRoundedIcon} sx={CARD_SX}>
      <Skeleton variant="rounded" sx={{ height: { xs: 150, sm: 190 } }} />
    </PlantSection>
  </>
);

/** NO_DATA_TODAY, NOT_AVAILABLE and NO_COEFFICIENT_TODAY: the hero and a title with its explanation. */
const WithoutData: FC<{ view: WithoutDataView; supplyLabel: string }> = ({ view, supplyLabel }) => (
  <PlantSection title={NOW_TITLE} description={NOW_DESCRIPTION} icon={BoltRoundedIcon} sx={CARD_SX}>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <EnergyFlowHero mode={view.heroMode} powerKW={null} plantPowerKW={null} supplyLabel={supplyLabel} />
      <Box>
        <Typography component="h3" sx={{ fontSize: fontSizes["2xl"], fontWeight: 600, color: colors.text.primary }}>
          {view.title}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: colors.text.body }}>
          {view.text}
        </Typography>
        {view.contactLink && (
          <Link
            component={RouterLink}
            to={view.contactLink}
            sx={{ display: "inline-block", mt: 1.5, color: colors.brand.main, "&:hover": { color: colors.brand.dark } }}
          >
            {CONTACT_LINK}
          </Link>
        )}
      </Box>
    </Box>
  </PlantSection>
);

const AvailableToday: FC<{
  view: AvailableView;
  supplyLabel: string;
  curvePoints: NonNullable<Parameters<typeof inverterCurve>[0]>;
}> = ({ view, supplyLabel, curvePoints }) => {
  // Read at every render: each refetch moves the "Ahora" mark along.
  const now = Date.now();
  const curve = useMemo(() => inverterCurve(curvePoints, now), [curvePoints, now]);

  return (
    <>
      <PlantSection title={NOW_TITLE} description={NOW_DESCRIPTION} icon={BoltRoundedIcon} sx={CARD_SX}>
        {view.lastUpdated && (
          <Typography variant="caption" sx={{ display: "block", mt: -1.5, mb: 2, color: colors.text.secondary }}>
            {freshnessText(view.lastUpdated)}
          </Typography>
        )}
        <Box sx={{ containerType: "inline-size" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              [WIDE_CARD]: { flexDirection: "row", alignItems: "flex-start" },
            }}
          >
            {/* The hero and its sentence are one block: the sentence never joins the figures. */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%", maxWidth: 360, flexShrink: 0 }}>
              <EnergyFlowHero
                mode={view.heroMode}
                powerKW={view.powerKW}
                plantPowerKW={view.plantPowerKW}
                supplyLabel={supplyLabel}
                staleAt={view.staleAt ?? undefined}
              />
              <Typography variant="body1" aria-live="polite" sx={{ color: colors.text.body }}>
                {view.statusSentence}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                minWidth: 0,
                [WIDE_CARD]: { mt: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 3,
                  [WIDE_CARD]: { flexDirection: "column" },
                }}
              >
                {view.currentFigure && <Figure label={view.currentFigure.label} value={view.currentFigure.value} />}
                <Figure label={view.energyFigure.label} value={view.energyFigure.value} />
              </Box>
              {view.coefficientLine && (
                <Typography variant="body2" sx={{ color: colors.text.body }}>
                  {view.coefficientLine}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </PlantSection>

      {view.staleNotice && (
        <Box sx={sxStyles.pageContainer}>
          <NeutralNotice>{view.staleNotice}</NeutralNotice>
        </Box>
      )}

      <PlantSection title={CURVE_TITLE} description={CURVE_DESCRIPTION} icon={ShowChartRoundedIcon} sx={CARD_SX}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box component="ul" aria-label="Leyenda" sx={{ display: "flex", flexWrap: "wrap", gap: 2, listStyle: "none", m: 0, p: 0 }}>
            <LegendEntry swatch={<Swatch bgcolor={ENERGY_COLORS.assigned} />} label={`${CURVE_SERIES} (kW)`} />
            <LegendEntry swatch={<Swatch bgcolor={colors.brand.main} line />} label={NOW_LABEL} />
            {curve.gaps.length > 0 && (
              <LegendEntry
                swatch={<Swatch bgcolor={colors.background.surface} border={`1px solid ${colors.border.light}`} />}
                label={GAP_LABEL}
              />
            )}
          </Box>
          <InverterTodayChart
            curve={curve}
            nowPowerKW={view.nowPowerKW}
            description={curveDescription(curve, view.nowPowerKW)}
            seriesName={CURVE_SERIES}
          />
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <InfoOutlinedIcon aria-hidden sx={{ fontSize: 16, mt: 0.25, color: colors.text.subtle }} />
            <Typography variant="caption" sx={{ color: colors.text.secondary }}>
              {view.note}
            </Typography>
          </Box>
        </Box>
      </PlantSection>
    </>
  );
};

/** A figure of the "Ahora" card, with the gold swatch beside it: gold is a mark, never text. */
const Figure: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
    <Swatch bgcolor={ENERGY_COLORS.assigned} />
    <Stat variant="big" label={label} value={value} />
  </Box>
);

/** What the curve shows, for a reader who cannot see it. */
function curveDescription(curve: InverterCurve, nowPowerKW: number | null): string {
  const until = axisTime(curve.now, curve.dayEnd);
  const measured = curve.points.filter((point): point is [number, number] => point[1] !== null);
  const peak = measured.reduce<[number, number] | null>((best, point) => (best === null || point[1] > best[1] ? point : best), null);
  const parts = [`Potencia que te llega hoy, de 00:00 a las ${until}.`];
  if (peak && peak[1] > 0) parts.push(`Máximo ${formatKilowatts(peak[1])} a las ${axisTime(peak[0], curve.dayEnd)}.`);
  if (nowPowerKW !== null) parts.push(`Ahora, ${formatKilowatts(nowPowerKW)}.`);
  if (curve.gaps.length > 0) parts.push(`Sin datos ${gapsPhrase(curve.gaps, curve.dayEnd)}.`);
  return parts.join(" ");
}
