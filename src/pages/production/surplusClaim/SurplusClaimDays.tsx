import { useState, type FC, type ReactNode } from "react";
import {
  Box,
  ButtonBase,
  Chip,
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
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { PlantSurplusClaimDayResponse, PlantSurplusClaimResponse } from "../../../api/models";
import { PlantSurplusClaimDayResponseState } from "../../../api/models";
import { PlantSection } from "../../../components/PlantSection";
import { formatKilowattHourAmount, formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { formatKilowatts } from "../../../utils/formatKilowatts";
import { colors, radii } from "../../../theme/tokens";
import { NO_FIGURE } from "./SurplusClaimSummary";
import { clockChangeLabel, dayLabel, hourLabelOf, hourLabels, hourPlaces, type HourPlace } from "./surplusClaimFormat";

const LEGEND =
  "Real: todas las horas del día tienen datos de la distribuidora. Estimado: faltan horas; el día va al fichero marcado como estimado (E).";

const numeric = { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } as const;

const kWhAmount = (value: number | null) => (value === null ? NO_FIGURE : formatKilowattHourAmount(value));

/** "Estimado" is a normal state of a day, not a failure: a neutral chip, never alert colour (UI-SCL-006). */
const DayState: FC<{ day: PlantSurplusClaimDayResponse }> = ({ day }) =>
  day.state === PlantSurplusClaimDayResponseState.ESTIMATED ? (
    <Chip
      label="Estimado"
      size="small"
      variant="outlined"
      sx={{ borderColor: colors.border.light, color: colors.text.secondary, fontWeight: 600 }}
    />
  ) : (
    <span>Real</span>
  );

interface DayView {
  day: PlantSurplusClaimDayResponse;
  label: string;
  clockChange: string | null;
  peak: string;
  panelId: string;
}

/** The hours of an open day, with the ones above the plant's nominal power marked and explained. */
const DayHours: FC<{ view: DayView; aboveNominal: ReadonlySet<number>; nominalPowerKW: number }> = ({
  view,
  aboveNominal,
  nominalPowerKW,
}) => {
  const { day, label, clockChange } = view;
  const labels = hourLabels(day.hours);
  const flagged = day.hours.flatMap((hour, index) =>
    hour.surplusKWh !== null && aboveNominal.has(Date.parse(hour.startsAt)) ? [{ label: labels[index], surplusKWh: hour.surplusKWh }] : [],
  );
  return (
    <Box id={view.panelId} sx={{ display: "flex", flexDirection: "column", gap: 1, py: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {`Horas del ${label} (kWh)${clockChange ? ` · ${day.hours.length} horas` : ""}`}
      </Typography>
      <Box
        component="ul"
        aria-label={`Horas del ${label}`}
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "grid",
          gridTemplateColumns: { xs: "repeat(3, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))", md: "repeat(6, minmax(0, 1fr))" },
          gap: 1,
        }}
      >
        {day.hours.map((hour, index) => {
          const isFlagged = aboveNominal.has(Date.parse(hour.startsAt));
          return (
            <Box
              component="li"
              key={hour.startsAt}
              sx={{
                display: "flex",
                flexDirection: "column",
                px: 0.75,
                py: 0.5,
                borderRadius: radii.small,
                ...(isFlagged && { bgcolor: colors.warning.surface, color: colors.warning.dark, boxShadow: `inset 0 0 0 1px ${colors.warning.vivid}` }),
              }}
            >
              <Typography component="span" variant="caption" sx={{ color: isFlagged ? "inherit" : colors.text.secondary }}>
                {labels[index]}
              </Typography>
              {/* A gap is not a measured zero (UI-SCL-007). */}
              <Typography component="span" variant="body2" sx={{ ...numeric, fontWeight: 600, color: isFlagged ? "inherit" : colors.text.primary }}>
                {hour.surplusKWh === null ? "Sin datos" : formatKilowattHourAmount(hour.surplusKWh)}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {flagged.map((hour) => (
        <Typography key={hour.label} variant="body2" sx={{ color: colors.warning.dark }}>
          {`${hour.label}: ${formatKilowattHours(hour.surplusKWh)}, más que la potencia nominal de la planta (${formatKilowatts(nominalPowerKW)}). Puede haber datos duplicados.`}
        </Typography>
      ))}
    </Box>
  );
};

const ExpandIcon: FC<{ open: boolean }> = ({ open }) => (
  <ExpandMoreRoundedIcon
    aria-hidden
    fontSize="small"
    sx={{ color: colors.text.muted, transform: open ? "rotate(180deg)" : undefined, flexShrink: 0 }}
  />
);

interface TableProps {
  views: DayView[];
  openDate: string | null;
  onToggle: (date: string) => void;
  monthTotal: string;
  renderHours: (view: DayView) => ReactNode;
}

/** From `sm` up: a table, each day's date a button that opens its hours under it. */
const WideTable: FC<TableProps> = ({ views, openDate, onToggle, monthTotal, renderHours }) => (
  <TableContainer>
    <Table size="small" aria-label="Excedentes día a día">
      <TableHead>
        <TableRow>
          <TableCell scope="col">Fecha</TableCell>
          <TableCell scope="col">Estado</TableCell>
          <TableCell scope="col" align="right">
            Total (kWh)
          </TableCell>
          <TableCell scope="col">Hora pico</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {views.map((view) => {
          const open = openDate === view.day.date;
          return [
            <TableRow key={view.day.date} hover onClick={() => onToggle(view.day.date)} sx={{ cursor: "pointer" }}>
              <TableCell component="th" scope="row" sx={{ color: colors.text.primary }}>
                <ButtonBase
                  aria-expanded={open}
                  aria-controls={open ? view.panelId : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(view.day.date);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    font: "inherit",
                    textAlign: "left",
                    borderRadius: radii.small,
                    "&.Mui-focusVisible": { outline: `2px solid ${colors.brand.main}`, outlineOffset: 2 },
                  }}
                >
                  <ExpandIcon open={open} />
                  <Box component="span" sx={{ display: "flex", flexDirection: "column" }}>
                    <span>{view.label}</span>
                    {view.clockChange && (
                      <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
                        {view.clockChange}
                      </Typography>
                    )}
                  </Box>
                </ButtonBase>
              </TableCell>
              <TableCell>
                <DayState day={view.day} />
              </TableCell>
              <TableCell align="right" sx={numeric}>
                {kWhAmount(view.day.surplusKWh)}
              </TableCell>
              <TableCell sx={numeric}>{view.peak}</TableCell>
            </TableRow>,
            open && (
              <TableRow key={`${view.day.date}-hours`}>
                <TableCell colSpan={4}>{renderHours(view)}</TableCell>
              </TableRow>
            ),
          ];
        })}
      </TableBody>
      <TableFooter>
        <TableRow sx={{ "& th, & td": { fontWeight: 600, color: colors.text.primary, borderBottom: "none" } }}>
          <TableCell component="th" scope="row" colSpan={2}>
            Total del mes
          </TableCell>
          <TableCell align="right" sx={numeric}>
            {monthTotal}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  </TableContainer>
);

/** Below `sm`: one row per day, the whole row a button, and the month total as the last row. */
const NarrowRows: FC<TableProps> = ({ views, openDate, onToggle, monthTotal, renderHours }) => (
  <Box>
    <Box
      aria-hidden
      sx={{ display: "flex", justifyContent: "space-between", pb: 0.75, pr: 4, borderBottom: `1px solid ${colors.divider}` }}
    >
      <Typography variant="caption" sx={{ color: colors.text.secondary }}>
        Fecha
      </Typography>
      <Typography variant="caption" sx={{ color: colors.text.secondary }}>
        Total (kWh)
      </Typography>
    </Box>
    <Box component="ul" aria-label="Excedentes día a día" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {views.map((view) => {
        const open = openDate === view.day.date;
        return (
          <Box component="li" key={view.day.date} sx={{ borderBottom: `1px solid ${colors.divider}` }}>
            <ButtonBase
              aria-expanded={open}
              aria-controls={open ? view.panelId : undefined}
              onClick={() => onToggle(view.day.date)}
              sx={{
                width: "100%",
                minHeight: 56,
                py: 1,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto 24px",
                gap: 1,
                alignItems: "center",
                textAlign: "left",
                "&.Mui-focusVisible": { outline: `2px solid ${colors.brand.main}`, outlineOffset: 2 },
              }}
            >
              <Box component="span" sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
                <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
                  {view.label}
                </Typography>
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75, color: colors.text.secondary }}
                >
                  <DayState day={view.day} />
                  {/* The chip separates itself; "Real" is text, and takes a separator. */}
                  {view.day.state === PlantSurplusClaimDayResponseState.REAL && <span>·</span>}
                  <span>{`Pico ${view.peak}`}</span>
                  {view.clockChange && (
                    <Box component="span" sx={{ fontWeight: 600, color: colors.text.primary }}>
                      {view.clockChange}
                    </Box>
                  )}
                </Typography>
              </Box>
              <Typography component="span" variant="body2" sx={{ ...numeric, fontWeight: 600, color: colors.text.primary }}>
                {kWhAmount(view.day.surplusKWh)}
              </Typography>
              <ExpandIcon open={open} />
            </ButtonBase>
            {open && renderHours(view)}
          </Box>
        );
      })}
      <Box component="li" sx={{ display: "flex", justifyContent: "space-between", py: 1.5, pr: 4 }}>
        <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
          Total del mes
        </Typography>
        <Typography component="span" variant="body2" sx={{ ...numeric, fontWeight: 600, color: colors.text.primary }}>
          {monthTotal}
        </Typography>
      </Box>
    </Box>
  </Box>
);

const peakText = (day: PlantSurplusClaimDayResponse, places: Map<number, HourPlace>) =>
  day.peakHour ? `${hourLabelOf(places, day.peakHour.startsAt)} · ${formatKilowattHours(day.peakHour.surplusKWh)}` : NO_FIGURE;

/**
 * "Excedentes día a día": one row per day of the month with its state, total
 * and peak hour, each opening to its hours, then the legend of the states
 * (UI-SCL-006, UI-SCL-007). A table from `sm` up, rows below. One day is open
 * at a time; remount it for another month.
 */
export const SurplusClaimDays: FC<{ claim: PlantSurplusClaimResponse; nominalPowerKW: number }> = ({ claim, nominalPowerKW }) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  const [openDate, setOpenDate] = useState<string | null>(null);

  const places = hourPlaces(claim.days);
  const aboveNominal = new Set(claim.warnings.hoursAboveNominalPower.map(({ startsAt }) => Date.parse(startsAt)));
  const views: DayView[] = claim.days.map((day) => ({
    day,
    label: dayLabel(day.date),
    clockChange: clockChangeLabel(day),
    peak: peakText(day, places),
    panelId: `surplus-claim-hours-${day.date}`,
  }));
  const tableProps: TableProps = {
    views,
    openDate,
    onToggle: (date) => setOpenDate((current) => (current === date ? null : date)),
    monthTotal: kWhAmount(claim.summary.surplusKWh),
    renderHours: (view) => <DayHours view={view} aboveNominal={aboveNominal} nominalPowerKW={nominalPowerKW} />,
  };

  return (
    <PlantSection
      title="Excedentes día a día"
      description={isWide ? "Abre un día para ver sus horas." : "Toca un día para ver sus horas."}
      icon={CalendarMonthRoundedIcon}
    >
      <Box sx={{ mt: 2 }}>{isWide ? <WideTable {...tableProps} /> : <NarrowRows {...tableProps} />}</Box>
      <Typography variant="body2" sx={{ mt: 1.5, color: colors.text.secondary }}>
        {LEGEND}
      </Typography>
    </PlantSection>
  );
};
