import { useMemo, useState, type FC, type ReactNode } from "react";
import {
  Box,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import type { SupplyResponse } from "../../api/models";
import { colors } from "../../theme/tokens";
import { formatEuroAmount, formatEurosPerKilowattHour, formatKilowattHourAmount } from "../../utils/formatEnergyFigures";
import { triggerBrowserDownload } from "../../utils/triggerBrowserDownload";
import { HomeCard } from "../home/HomeCard";
import {
  GRID_IMPORT_SERIES,
  SAVINGS_SERIES,
  SELF_CONSUMPTION_SERIES,
  SURPLUS_SERIES,
  toConsumptionSeriesView,
  type ConsumptionSeries,
  type SlotView,
} from "../../components/evolution/consumptionSeries";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import { GRANULARITY_PHRASE, type Granularity, type HistoricalPeriod } from "../../components/period/historicalPeriod";
import { PairedTerm } from "../../components/evolution/PairedTerm";
import { CSV_MIME_TYPE, periodCsv, periodCsvFileName } from "./periodCsv";
import { PAGE_SIZE, showingText, totalsStateText } from "./periodDataTable";
import { slotStateText } from "../../components/evolution/slotStateText";
import { usePeriodConsumptionSeries } from "./usePeriodConsumptionSeries";
import type { PeriodEnergyMetrics } from "../../components/EnergyFigures/periodEnergyMetrics";
import { usePeriodEnergyMetrics } from "./usePeriodEnergyMetrics";

const TITLE = "Tus datos";
const DATE_HEADER = { hourly: "Hora", daily: "Día", monthly: "Mes" } as const;
const STATE_HEADER = "Datos";
const TOTAL_LABEL = "Total del periodo";
const GAP_CELL = "—";
const LOADING_LABEL = "Cargando la tabla de tus datos…";
/** Neutral: the card and the charts that own the failed request already say so, with "Reintentar". */
const UNAVAILABLE = "La tabla estará disponible cuando se carguen tus datos.";

/** One row of the table: a slot's, or the period's totals. Every figure is already a string. */
interface Row {
  key: string;
  label: string;
  values: string[];
  state: string;
}

/**
 * The four value columns, in the order the charts' legends name them, each
 * with its unit: the header states it once, and the cells hold bare figures
 * (UI-HIS-021).
 */
const VALUE_COLUMNS = [
  { term: SELF_CONSUMPTION_SERIES, unit: "kWh" },
  { term: GRID_IMPORT_SERIES, unit: "kWh" },
  { term: SURPLUS_SERIES, unit: "kWh" },
  { term: SAVINGS_SERIES, unit: "€" },
] as const;

const kilowattHoursCell = (value: number | null) => (value === null ? GAP_CELL : formatKilowattHourAmount(value));
const eurosCell = (value: number | null) => (value === null ? GAP_CELL : formatEuroAmount(value));

function slotRow(slot: SlotView, granularity: Granularity): Row {
  return {
    key: slot.key,
    label: slot.tableLabel,
    values: [
      kilowattHoursCell(slot.selfConsumptionKWh),
      kilowattHoursCell(slot.gridImportKWh),
      kilowattHoursCell(slot.surplusKWh),
      eurosCell(slot.savingsEur),
    ],
    state: slotStateText(slot.state, granularity).short,
  };
}

/** The energy-metrics totals of the same period and scope: never a sum of the rows. */
function totalsRow(metrics: PeriodEnergyMetrics, slots: SlotView[], granularity: Granularity): Row {
  const { energy, savings } = metrics;
  return {
    key: "total",
    label: TOTAL_LABEL,
    values: [
      kilowattHoursCell(energy.selfConsumptionKWh),
      kilowattHoursCell(energy.gridImportKWh),
      kilowattHoursCell(energy.surplusKWh),
      eurosCell(savings.amountEur),
    ],
    state: totalsStateText(slots, granularity),
  };
}

const subtitleOf = (period: HistoricalPeriod) => `${period.label}, ${GRANULARITY_PHRASE[period.granularity]}`;

const numericCell = { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } as const;

const DataRow: FC<{ row: Row; total?: boolean }> = ({ row, total = false }) => (
  <TableRow sx={total ? { "& th, & td": { fontWeight: 600, color: colors.text.primary, borderBottom: "none" } } : undefined}>
    <TableCell component="th" scope="row" sx={{ color: colors.text.primary, whiteSpace: "nowrap" }}>
      {row.label}
    </TableCell>
    {row.values.map((value, index) => (
      <TableCell key={VALUE_COLUMNS[index].term} align="right" sx={numericCell}>
        {value}
      </TableCell>
    ))}
    <TableCell sx={{ color: colors.text.body }}>{row.state}</TableCell>
  </TableRow>
);

/**
 * From `sm` up: a real table, the accessible alternative to the charts. The
 * estimated price, when there is one, is the savings header's second line, so
 * it sits on the column it prices.
 */
const DesktopTable: FC<{ caption: string; granularity: Granularity; rows: Row[]; total: Row; price: string | null }> = ({
  caption,
  granularity,
  rows,
  total,
  price,
}) => (
  <TableContainer>
    <Table size="small">
      <Box component="caption" sx={visuallyHidden}>
        {caption}
      </Box>
      <TableHead>
        <TableRow>
          <TableCell scope="col">{DATE_HEADER[granularity]}</TableCell>
          {VALUE_COLUMNS.map(({ term, unit }) => (
            // Each line on one line: the unit stays with its term, and the term and its technical companion stay whole.
            <TableCell key={term} scope="col" align="right" sx={{ whiteSpace: "nowrap" }}>
              <PairedTerm term={term} unit={unit} stacked />
              {term === SAVINGS_SERIES && price && (
                <>
                  {" "}
                  <Typography component="span" variant="caption" sx={{ display: "block", color: colors.text.body, whiteSpace: "nowrap" }}>
                    con {price}
                  </Typography>
                </>
              )}
            </TableCell>
          ))}
          <TableCell scope="col">{STATE_HEADER}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <DataRow key={row.key} row={row} />
        ))}
      </TableBody>
      <TableFooter>
        <DataRow row={total} total />
      </TableFooter>
    </Table>
  </TableContainer>
);

const RowCard: FC<{ row: Row; total?: boolean }> = ({ row, total = false }) => (
  <Box
    component="li"
    aria-label={row.label}
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 0.75,
      py: 1.5,
      borderTop: `1px solid ${total ? colors.border.light : colors.divider}`,
      minWidth: 0,
    }}
  >
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", columnGap: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {row.label}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {row.state}
      </Typography>
    </Box>
    <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 2, rowGap: 0.25 }}>
      {row.values.map((value, index) => (
        <Box key={VALUE_COLUMNS[index].term} sx={{ display: "contents" }}>
          <Typography component="dt" variant="body2" sx={{ color: colors.text.subtle, minWidth: 0 }}>
            <PairedTerm term={VALUE_COLUMNS[index].term} unit={VALUE_COLUMNS[index].unit} />
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, textAlign: "right", color: colors.text.primary, ...numericCell, fontWeight: total ? 600 : 400 }}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

/** Below `sm`: one card per row, the totals as the last card. */
const MobileCards: FC<{ caption: string; rows: Row[]; total: Row }> = ({ caption, rows, total }) => (
  <Box component="ul" aria-label={caption} sx={{ listStyle: "none", m: 0, p: 0 }}>
    {rows.map((row) => (
      <RowCard key={row.key} row={row} />
    ))}
    <RowCard row={total} total />
  </Box>
);

/** "Descargar CSV": disabled without a download, which only a loaded series and its metrics give. */
const DownloadButton: FC<{ onDownload?: () => void }> = ({ onDownload }) => (
  <Button
    variant="outlined"
    size="small"
    startIcon={<DownloadOutlinedIcon />}
    disabled={!onDownload}
    onClick={onDownload}
    sx={{ alignSelf: "flex-start", flexShrink: 0 }}
  >
    Descargar CSV
  </Button>
);

/** Where the table goes while it cannot be shown: a region of its own, with no heading until there is a table. */
const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <Box component="section" aria-label={TITLE} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
    <DownloadButton />
    {children}
  </Box>
);

const ReadyTable: FC<{
  period: HistoricalPeriod;
  series: ConsumptionSeries;
  metrics: PeriodEnergyMetrics;
  selected: SupplyResponse | null;
}> = ({ period, series, metrics, selected }) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  const [showAll, setShowAll] = useState(false);
  const { granularity } = period;
  const slots = useMemo(() => toConsumptionSeriesView(period, series).slots, [period, series]);
  const rows = slots.map((slot) => slotRow(slot, granularity));
  const shown = showAll ? rows : rows.slice(0, PAGE_SIZE);
  const total = totalsRow(metrics, slots, granularity);
  const subtitle = subtitleOf(period);
  const caption = `${TITLE}: ${subtitle}`;
  const { estimatedPrice } = metrics.savings;
  const price = estimatedPrice ? formatEurosPerKilowattHour(estimatedPrice.eurPerKWh) : null;
  // Every slot of the period, not only the rows on screen.
  const download = () =>
    triggerBrowserDownload(
      new Blob([periodCsv(slots, granularity, estimatedPrice)], { type: CSV_MIME_TYPE }),
      periodCsvFileName(selected, slots, granularity),
    );

  return (
    <HomeCard title={TITLE} icon={TableRowsRoundedIcon}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          {subtitle}
        </Typography>
        <DownloadButton onDownload={download} />
      </Box>
      {isWide ? (
        <DesktopTable caption={caption} granularity={granularity} rows={shown} total={total} price={price} />
      ) : (
        <>
          {/* Once, above the cards: repeated on each card it would be read up to 63 times. */}
          {price && (
            <Typography variant="caption" component="p" sx={{ color: colors.text.body }}>
              Ahorro estimado con {price}.
            </Typography>
          )}
          <MobileCards caption={caption} rows={shown} total={total} />
        </>
      )}
      {rows.length > PAGE_SIZE && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography variant="body2" sx={{ color: colors.text.subtle }}>
            {showingText(shown.length, rows.length, granularity)}
          </Typography>
          <Button size="small" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Ver menos" : "Ver todos"}
          </Button>
        </Box>
      )}
    </HomeCard>
  );
};

/**
 * The period's data as a table (#251): one row per slot of the evolution
 * charts (#250), with the same states in words, and the energy-metrics totals
 * of the same period and scope (#249) as its last row; and the same slots as
 * a CSV to download. Nothing renders, and nothing is fetched, until the
 * period is known.
 */
export const PeriodDataTable: FC<{ selected: SupplyResponse | null }> = ({ selected }) => {
  const period = useHistoricalPeriod();
  const series = usePeriodConsumptionSeries(selected);
  // Already cached: the period card asked for the same metrics (#249).
  const metrics = usePeriodEnergyMetrics(selected);
  if (!period) return null;
  // A failed request is reported, with its retry, by the block that owns it:
  // the period card (#249) or the evolution charts (#250), never twice.
  if (series.status === "error" || metrics.status === "error") {
    return (
      <Placeholder>
        <Typography variant="body2" sx={{ color: colors.text.body }}>
          {UNAVAILABLE}
        </Typography>
      </Placeholder>
    );
  }
  if (series.status !== "ready" || metrics.status !== "ready") {
    return (
      <Placeholder>
        <Skeleton variant="rounded" height={320} role="progressbar" aria-label={LOADING_LABEL} />
      </Placeholder>
    );
  }
  return <ReadyTable period={period} series={series.series} metrics={metrics.metrics} selected={selected} />;
};
