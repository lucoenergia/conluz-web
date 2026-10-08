import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { colors, radii } from "../../../theme/tokens";
import { HomeCard } from "../HomeCard";
import { NeutralNotice } from "../NeutralNotice";
import { BestHoursChart } from "./BestHoursChart";
import { ENERGY_COLORS, swatch } from "./energyColors";
import { BEST_HOURS_LABEL, CONSUMPTION_SERIES, PRODUCTION_SERIES, toHourlyProfileView, type HourlyProfileView } from "./hourlyProfile";
import { SeriesLegend } from "./SeriesLegend";
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

/**
 * Average consumption against average assigned production across the hours of
 * the day (#201), so the advice to move consumption to sunlit hours can be
 * seen rather than taken on trust. The endpoint always covers the latest
 * published month, so the caption names that month without suggesting the
 * member chose it. Loads, fails and retries on its own.
 */
export const BestHours: FC = () => {
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
      <BestHoursChart view={view} />
      <ProfileTable view={view} />
    </HomeCard>
  );
};
