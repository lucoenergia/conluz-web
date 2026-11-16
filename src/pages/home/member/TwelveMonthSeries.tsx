import type { FC } from "react";
import { Box, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { colors } from "../../../theme/tokens";
import { HomeCard } from "../HomeCard";
import { NeutralNotice } from "../../../components/EnergyFigures/NeutralNotice";
import {
  ENERGY_ROWS_LABEL,
  GRID_IMPORT_SERIES,
  MONTH_SEGMENTS,
  NOTHING_STORED_TEXT,
  SAVINGS_ROWS_LABEL,
  SAVINGS_SERIES,
  SELF_CONSUMPTION_SERIES,
  incompleteMarkText,
  monthDetail,
  monthEnergyRowName,
  monthSavingsRowName,
  toMonthlySeriesView,
  type MonthlySeriesView,
} from "./monthlySeries";
import { ENERGY_COLORS, SAVINGS_COLOR, swatch } from "../../../components/EnergyFigures/energyColors";
import { SeriesLegend } from "../../../components/evolution/SeriesLegend";
import { EnergyEvolutionRows, SavingsEvolutionRows } from "../../../components/evolution/EvolutionRows";
import { formatKilowattHourAmount } from "../../../utils/formatEnergyFigures";
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

/** Wide enough for the figure column's heading, "De la comunidad". */
const COMMUNITY_FIGURE_WIDTH = 92;

/** An incomplete month's mark after its bars, as the chart draws it: "1 de 2". The row's name says it in words. */
const incompleteMark = (state: { reported: number; total: number }) => (
  <Typography aria-hidden component="span" variant="caption" sx={{ flex: "none", color: colors.text.body, whiteSpace: "nowrap" }}>
    {incompleteMarkText(state)}
  </Typography>
);

/**
 * Below sm, the twelve months as rows (UI-CHT-001, UI-HOM-015): the energy
 * rows, community energy stacked with grid energy and the community figure,
 * each opening what the chart's tooltip says; then the savings rows.
 */
const SeriesRows: FC<{ view: MonthlySeriesView }> = ({ view }) => (
  <>
    <EnergyEvolutionRows
      slots={view.rows.slots}
      look={{ segments: MONTH_SEGMENTS }}
      scaleEnd={view.rows.energyScale}
      header={SELF_CONSUMPTION_SERIES}
      listLabel={ENERGY_ROWS_LABEL}
      detail={monthDetail}
      value={({ month }) => (month.selfConsumptionKWh === null ? "—" : formatKilowattHourAmount(month.selfConsumptionKWh))}
      name={monthEnergyRowName}
      valueWidth={COMMUNITY_FIGURE_WIDTH}
      partialMark={incompleteMark}
    />
    <SavingsEvolutionRows
      slots={view.rows.slots}
      color={SAVINGS_COLOR}
      scaleEnd={view.rows.savingsScale}
      listLabel={SAVINGS_ROWS_LABEL}
      name={monthSavingsRowName}
      partialMark={incompleteMark}
    />
  </>
);

const Series: FC<{ referencePeriod: ReferencePeriod }> = ({ referencePeriod }) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
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
    <HomeCard title={TITLE} icon={BarChartRoundedIcon}>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        De {first.name} a {last.name}: {view.monthsWithData} de {view.months.length} meses con datos.
        {view.hasIncompleteMonth &&
          " Un mes marcado con dos cifras, como «1 de 2», solo suma los suministros que enviaron datos: una barra más baja no significa que consumieras menos."}
      </Typography>
      <SeriesLegend
        items={[
          { label: SELF_CONSUMPTION_SERIES, swatch: swatch.solid(ENERGY_COLORS.community) },
          { label: GRID_IMPORT_SERIES, swatch: swatch.solid(ENERGY_COLORS.grid) },
          { label: SAVINGS_SERIES, swatch: swatch.solid(SAVINGS_COLOR) },
        ]}
      />
      {/* Below sm the chart is not mounted at all: hidden, it would still draw its bars. */}
      {isWide ? <TwelveMonthChart view={view} /> : <SeriesRows view={view} />}
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
