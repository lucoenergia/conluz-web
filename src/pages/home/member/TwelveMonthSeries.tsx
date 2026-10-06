import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { colors } from "../../../theme/tokens";
import { HomeCard } from "../HomeCard";
import { NeutralNotice } from "../NeutralNotice";
import {
  GRID_IMPORT_SERIES,
  NOTHING_STORED_TEXT,
  SAVINGS_SERIES,
  SELF_CONSUMPTION_SERIES,
  toMonthlySeriesView,
  type MonthlySeriesView,
} from "./monthlySeries";
import { TwelveMonthChart } from "./TwelveMonthChart";
import { useMemberEnergyMetrics, type ReferencePeriod } from "./useMemberEnergyMetrics";
import { useTwelveMonthSeries } from "./useTwelveMonthSeries";

const TITLE = "Tus últimos 12 meses";

/**
 * The chart's data as a table, for anyone who cannot see the chart. Renders
 * the same view the chart draws, and nothing else.
 */
const SeriesTable: FC<{ view: MonthlySeriesView }> = ({ view }) => (
  // Hidden on a wrapping block, not on the table: overflow does not clip a
  // table box, so a hidden table still widens the page to its full width.
  <Box sx={visuallyHidden}>
    <table>
      <caption>Datos del gráfico: {TITLE.toLowerCase()}</caption>
      <thead>
        <tr>
          <th scope="col">Mes</th>
          <th scope="col">{SELF_CONSUMPTION_SERIES}</th>
          <th scope="col">{GRID_IMPORT_SERIES}</th>
          <th scope="col">{SAVINGS_SERIES}</th>
          <th scope="col">Datos del mes</th>
        </tr>
      </thead>
      <tbody>
        {view.months.map((month) => (
          <tr key={month.date}>
            <th scope="row">{month.name}</th>
            <td>{month.selfConsumptionText}</td>
            <td>{month.gridImportText}</td>
            <td>{month.savingsText}</td>
            <td>{month.state.kind === "nothing-stored" ? NOTHING_STORED_TEXT : (month.incompleteText ?? "Completos")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Box>
);

const Series: FC<{ referencePeriod: ReferencePeriod }> = ({ referencePeriod }) => {
  const { buckets, isLoading, isError, retry } = useTwelveMonthSeries(referencePeriod);

  if (isError) return <LoadErrorAlert message="No se pudieron cargar tus últimos 12 meses." onRetry={retry} />;
  if (isLoading || !buckets) return <Skeleton variant="rounded" height={480} aria-label="Cargando tus últimos 12 meses" />;

  const view = toMonthlySeriesView(buckets);
  if (view.monthsWithData === 0) {
    return (
      <NeutralNotice title="Todavía no hay meses que mostrar">
        Tus últimos 12 meses aparecerán aquí a medida que la distribuidora publique los datos de tus puntos de suministro.
      </NeutralNotice>
    );
  }

  const first = view.months[0];
  const last = view.months[view.months.length - 1];
  return (
    <HomeCard title={TITLE}>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        De {first.name} a {last.name}: {view.monthsWithData} de {view.months.length} meses con datos.
        {view.hasIncompleteMonth &&
          " Un mes marcado con dos cifras, como «1 de 2», solo suma los suministros que enviaron datos: una barra más baja no significa que consumieras menos."}
      </Typography>
      <TwelveMonthChart view={view} />
      <SeriesTable view={view} />
    </HomeCard>
  );
};

/**
 * Self-consumed energy against grid import, and the savings, over the twelve
 * months ending at the reference month (#201). Waits for the reference month
 * and renders nothing until it resolves: its loading, failure and absence are
 * the energy half's to explain. Its own read loading or failing never holds up
 * the rest of the page.
 */
export const TwelveMonthSeries: FC = () => {
  const { referencePeriod } = useMemberEnergyMetrics();
  if (!referencePeriod) return null;
  return <Series referencePeriod={referencePeriod} />;
};
