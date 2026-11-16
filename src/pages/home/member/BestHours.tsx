import type { FC } from "react";
import { Box, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { colors, radii } from "../../../theme/tokens";
import { HomeCard } from "../HomeCard";
import { NeutralNotice } from "../../../components/EnergyFigures/NeutralNotice";
import { BestHoursChart } from "./BestHoursChart";
import { ENERGY_COLORS, swatch } from "../../../components/EnergyFigures/energyColors";
import {
  BEST_HOURS_LABEL,
  BEST_HOUR_TEXT,
  CONSUMPTION_SERIES,
  HOUR_ROWS_LABEL,
  HOUR_SEGMENTS,
  NO_SAMPLE_TEXT,
  PRODUCTION_SERIES,
  hourBarMark,
  hourDetail,
  hourFigure,
  hourRowName,
  toHourlyProfileView,
  type HourlyProfileView,
} from "./hourlyProfile";
import { SeriesLegend } from "../../../components/evolution/SeriesLegend";
import { EnergyEvolutionRows } from "../../../components/evolution/EvolutionRows";
import { useHourlyProfile } from "./useHourlyProfile";

/** The heading says what the hours are best for; it also names the block's region. */
const TITLE = "Tus mejores horas para autoconsumir";

type Profile = Extract<HourlyProfileView, { kind: "profile" }>;

/**
 * The chart's data as a table, for anyone who cannot see the chart. Renders
 * the same view the chart draws, and nothing else.
 */
const ProfileTable: FC<{ view: Profile }> = ({ view }) => (
  // Hidden on a wrapping block, not on the table: overflow does not clip a
  // table box, so a hidden table still widens the page to its full width.
  <Box sx={visuallyHidden}>
    <table>
      <caption>Datos del gráfico: tus mejores horas</caption>
      <thead>
        <tr>
          <th scope="col">Hora</th>
          <th scope="col">{CONSUMPTION_SERIES}</th>
          <th scope="col">{PRODUCTION_SERIES}</th>
        </tr>
      </thead>
      <tbody>
        {view.hours.map((hour) => (
          <tr key={hour.hour}>
            <th scope="row">{hour.label}</th>
            <td>{hour.consumptionText}</td>
            <td>{hour.productionText}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Box>
);

/** Wide enough for the figure column's heading, "Tu consumo", and for its widest figure, "menos de 0,01". */
const CONSUMPTION_FIGURE_WIDTH = 88;

/**
 * Below sm, the hours as rows (UI-CHT-001, UI-HOM-015): consumption, with the
 * assigned energy beneath it, each bar with its own ring or dot; a best hour
 * carries the lead's sun and says so in its name, never by its tint alone.
 */
const ProfileRows: FC<{ view: Profile }> = ({ view }) => (
  <EnergyEvolutionRows
    slots={view.rows.slots}
    look={{ segments: HOUR_SEGMENTS }}
    scaleEnd={view.rows.scale}
    header={CONSUMPTION_SERIES}
    listLabel={HOUR_ROWS_LABEL}
    detail={hourDetail}
    value={hourFigure}
    name={hourRowName}
    valueWidth={CONSUMPTION_FIGURE_WIDTH}
    barMark={hourBarMark}
    gapText={NO_SAMPLE_TEXT}
    rowMark={{
      applies: ({ hour }) => hour.best,
      icon: <WbSunnyRoundedIcon sx={{ fontSize: 14, color: colors.success.main }} />,
      text: BEST_HOUR_TEXT,
      tint: ENERGY_COLORS.bestHours,
    }}
  />
);

/**
 * Average consumption against average assigned production across the hours of
 * the day (#201), so the advice to move consumption to sunlit hours can be
 * seen rather than taken on trust. The endpoint always covers the latest
 * published month, so the caption names that month without suggesting the
 * member chose it. Loads, fails and retries on its own.
 */
export const BestHours: FC = () => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  const { profile, isLoading, isError, retry } = useHourlyProfile();

  if (isError) return <LoadErrorAlert message="No se pudieron cargar tus mejores horas." onRetry={retry} />;
  if (isLoading || !profile) return <Skeleton variant="rounded" height={340} aria-label="Cargando tus mejores horas" />;

  const view = toHourlyProfileView(profile);
  if (view.kind === "nothing-yet") {
    return (
      <NeutralNotice title="Todavía no hay horas que mostrar">
        Aparecerán cuando la distribuidora publique el primer mes con registros horarios de tus puntos de suministro.
      </NeutralNotice>
    );
  }

  return (
    <HomeCard title={TITLE} icon={ScheduleRoundedIcon}>
      {/* The answer before the chart: this is the block that says when to act. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          alignSelf: "flex-start",
          px: 1.5,
          py: 0.75,
          borderRadius: radii.default,
          bgcolor: colors.success.surface,
          color: colors.success.main,
        }}
      >
        <WbSunnyRoundedIcon aria-hidden fontSize="small" />
        <Typography variant="body1" component="p" sx={{ fontWeight: 600, color: colors.success.main }}>
          {view.bestHoursText}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        Media de cada hora en {view.month}, el último mes que ha publicado la distribuidora. Tus mejores horas son las que
        más energía asignada recibes: usar la electricidad en ellas es la mejor forma de aprovecharla. Un círculo vacío
        marca una hora sin registros, y uno relleno, una media de cero.
      </Typography>
      <SeriesLegend
        items={[
          { label: CONSUMPTION_SERIES, swatch: swatch.solid(ENERGY_COLORS.consumption) },
          { label: PRODUCTION_SERIES, swatch: swatch.solid(ENERGY_COLORS.assigned) },
          // A legend entry with nothing shaded would point at nothing.
          ...(view.hasBestHours ? [{ label: BEST_HOURS_LABEL, swatch: swatch.band }] : []),
        ]}
      />
      {/* Below sm the chart is not mounted at all: hidden, it would still draw its bars. */}
      {isWide ? <BestHoursChart view={view} /> : <ProfileRows view={view} />}
      <ProfileTable view={view} />
    </HomeCard>
  );
};
