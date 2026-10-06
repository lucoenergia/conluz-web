import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { colors } from "../../../theme/tokens";
import { HomeCard } from "../HomeCard";
import { NeutralNotice } from "../NeutralNotice";
import { BestHoursChart } from "./BestHoursChart";
import { CONSUMPTION_SERIES, PRODUCTION_SERIES, toHourlyProfileView, type HourlyProfileView } from "./hourlyProfile";
import { useHourlyProfile } from "./useHourlyProfile";

const TITLE = "Tus mejores horas";

type Profile = Extract<HourlyProfileView, { kind: "profile" }>;

/**
 * The chart's data as a table, for anyone who cannot see the chart. Renders
 * the same view the chart draws, and nothing else.
 */
const ProfileTable: FC<{ view: Profile }> = ({ view }) => (
  <Box component="table" sx={visuallyHidden}>
    <caption>Datos del gráfico: {TITLE.toLowerCase()}</caption>
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
    <HomeCard title={TITLE}>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        Media de cada hora en {view.month}, el último mes que ha publicado la distribuidora. Las horas en que la energía
        asignada supera tu consumo son las mejores para usar electricidad. Un círculo vacío marca una hora sin registros, y
        uno relleno, una media de cero.
      </Typography>
      <BestHoursChart view={view} />
      <ProfileTable view={view} />
    </HomeCard>
  );
};
