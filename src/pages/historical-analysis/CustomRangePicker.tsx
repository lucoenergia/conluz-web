import { createContext, useContext, useId, useState, type FC } from "react";
import { Box, Button, IconButton, Popover, SwipeableDrawer, Typography } from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { PickersDay, type PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import type { PickersCalendarHeaderProps } from "@mui/x-date-pickers/PickersCalendarHeader";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { ActionStatus } from "../../components/ActionStatus/ActionStatus";
import { colors, radii } from "../../theme/tokens";
import { toCalendarDay, toDayjs } from "./calendarDayjs";
import {
  addMonths,
  compareDays,
  lastDayOf,
  monthYearName,
  rangeResultText,
  resolvePeriod,
  type CalendarDay,
  type CalendarMonth,
  type PeriodSelection,
} from "./historicalPeriod";

const RANGE_TITLE = "Rango personalizado";
const RANGE_RULE = "Hasta 62 días se ve por días; si eliges más, se ajusta a meses completos. Como máximo, 24 meses.";
const RANGE_TOO_LONG = "El rango puede ser de 24 meses como máximo. Acorta las fechas.";

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Octubre de 2026 aún no está publicado." */
const unpublishedText = (month: CalendarMonth) => `${capitalise(monthYearName(month))} aún no está publicado.`;

const pad = (value: number) => String(value).padStart(2, "0");
const shortDay = ({ year, month, day }: CalendarDay) => `${pad(day)}/${pad(month)}/${year}`;

const monthsBetween = (from: CalendarMonth, to: CalendarMonth) => (to.year - from.year) * 12 + to.month - from.month;

export interface CustomRangePickerProps {
  open: boolean;
  anchor: CalendarMonth;
  /** The selection in force: a custom range opens on its days. */
  current: PeriodSelection;
  /** A popover beside the selector from sm up, a sheet below it. */
  variant: "popover" | "sheet";
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onApply: (selection: PeriodSelection) => void;
}

/**
 * "Rango personalizado" (#248): two calendar days, "Desde" and "Hasta", both
 * included, no later than the last day of the anchor month (UI-HIS-005). The
 * resulting period and granularity are announced before the range is applied
 * (UI-HIS-006), and a range over 24 months once snapped cannot be applied
 * (UI-HIS-007).
 *
 * Days are read from the picker as calendar fields only (`calendarDayjs`).
 */
export const CustomRangePicker: FC<CustomRangePickerProps> = ({ open, variant, anchorEl, onClose, ...rest }) => {
  const titleId = useId();
  // Mounted only while open, so each opening starts from the selection in force.
  const body = open && <RangePickerBody {...rest} onClose={onClose} titleId={titleId} monthsShown={variant === "popover" ? 2 : 1} />;

  if (variant === "popover") {
    return (
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-labelledby": titleId,
            sx: { width: 700, maxWidth: "calc(100% - 32px)", p: 2, borderRadius: radii.default },
          },
        }}
      >
        {body}
      </Popover>
    );
  }

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      // A drawer sits under the app bar; this one is a modal sheet, so it goes on top.
      sx={{ zIndex: (t) => t.zIndex.modal }}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": titleId,
          sx: { height: "calc(100% - 48px)", borderRadius: `${radii.large} ${radii.large} 0 0`, p: 2 },
        },
      }}
    >
      {body}
    </SwipeableDrawer>
  );
};

interface RangePickerBodyProps {
  anchor: CalendarMonth;
  current: PeriodSelection;
  titleId: string;
  monthsShown: number;
  onClose: () => void;
  onApply: (selection: PeriodSelection) => void;
}

/** The range being drawn, for the day cells. */
const RangeContext = createContext<{ from: CalendarDay | null; to: CalendarDay | null }>({ from: null, to: null });

/** One calendar's place in the row, for its header. */
const MonthSlotContext = createContext<{
  month: CalendarMonth;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoNext: boolean;
}>({ month: { year: 0, month: 1 }, canGoNext: false });

const RangePickerBody: FC<RangePickerBodyProps> = ({ anchor, current, titleId, monthsShown, onClose, onApply }) => {
  const [from, setFrom] = useState<CalendarDay | null>(current.kind === "custom" ? current.from : null);
  const [to, setTo] = useState<CalendarDay | null>(current.kind === "custom" ? current.to : null);
  const [editing, setEditing] = useState<"from" | "to">("from");
  // The first month shown: the one "Hasta" falls in, or the anchor month, as the design opens.
  const [firstMonth, setFirstMonth] = useState<CalendarMonth>(to ?? anchor);

  const anchorEnd = lastDayOf(anchor);
  const months = Array.from({ length: monthsShown }, (_, index) => addMonths(firstMonth, index));
  // Never page past the anchor month: from sm up, the month after it is shown, unpublished, beside it.
  const canGoNext = monthsBetween(firstMonth, anchor) > 0;

  const pick = (day: CalendarDay) => {
    if (editing === "from" || !from) {
      setFrom(day);
      if (to && compareDays(day, to) > 0) setTo(null);
      setEditing("to");
    } else if (compareDays(day, from) < 0) {
      setFrom(day);
    } else {
      setTo(day);
      setEditing("from");
    }
  };

  const draft: PeriodSelection | null = from && to ? { kind: "custom", from, to } : null;
  const resolution = draft ? resolvePeriod(anchor, draft) : null;
  const result = resolution?.status === "tooLong" ? RANGE_TOO_LONG : resolution ? rangeResultText(resolution) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <Typography id={titleId} variant="h6" component="h2">
          {RANGE_TITLE}
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <DayReadout label="Desde" day={from} active={editing === "from"} onClick={() => setEditing("from")} />
          <DayReadout label="Hasta" day={to} active={editing === "to"} onClick={() => setEditing("to")} />
        </Box>

        <RangeContext.Provider value={{ from, to }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
            {months.map((month, index) => (
              <MonthSlotContext.Provider
                key={`${month.year}-${month.month}`}
                value={{
                  month,
                  onPrevious: index === 0 ? () => setFirstMonth(addMonths(firstMonth, -1)) : undefined,
                  onNext: index === months.length - 1 ? () => setFirstMonth(addMonths(firstMonth, 1)) : undefined,
                  canGoNext,
                }}
              >
                <Box sx={{ flex: "1 1 280px", maxWidth: 320, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <DateCalendar
                    referenceDate={toDayjs({ ...month, day: 1 })}
                    value={null}
                    onChange={(value: Dayjs | null) => value && pick(toCalendarDay(value))}
                    views={["day"]}
                    // The month's own days only: keyboard focus stays in this calendar.
                    minDate={toDayjs({ ...month, day: 1 })}
                    maxDate={toDayjs(lastDayOf(month))}
                    shouldDisableDate={(value: Dayjs) => compareDays(toCalendarDay(value), anchorEnd) > 0}
                    disableHighlightToday
                    slots={{ calendarHeader: MonthHeader, day: RangeDay }}
                    sx={{ width: "100%", height: "auto", maxHeight: "none", m: 0 }}
                  />
                  {compareDays({ ...month, day: 1 }, anchorEnd) > 0 && (
                    <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                      {unpublishedText(month)}
                    </Typography>
                  )}
                </Box>
              </MonthSlotContext.Provider>
            ))}
          </Box>
        </RangeContext.Provider>

        <Box
          sx={{
            display: "flex",
            gap: 1.25,
            alignItems: "flex-start",
            bgcolor: colors.background.surface,
            borderRadius: radii.default,
            p: 1.5,
          }}
        >
          <InfoOutlinedIcon fontSize="small" sx={{ color: colors.text.subtle, mt: 0.25 }} aria-hidden />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {result && (
              <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
                {result}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: colors.text.body }}>
              {RANGE_RULE}
            </Typography>
          </Box>
        </Box>
        <ActionStatus message={result ?? ""} />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={resolution?.status !== "ok"} onClick={() => draft && onApply(draft)}>
            Aplicar
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

const DayReadout: FC<{ label: string; day: CalendarDay | null; active: boolean; onClick: () => void }> = ({ label, day, active, onClick }) => (
  <Button
    variant="outlined"
    color={active ? "primary" : "inherit"}
    aria-pressed={active}
    onClick={onClick}
    sx={{
      minHeight: 56,
      flexDirection: "column",
      alignItems: "flex-start",
      textTransform: "none",
      borderRadius: radii.default,
      borderWidth: active ? 2 : 1,
      "&.MuiButton-root": { borderColor: active ? "primary.main" : colors.border.inactive },
    }}
  >
    <Typography component="span" variant="caption" sx={{ color: active ? "primary.main" : colors.text.subtle }}>
      {label}
    </Typography>{" "}
    <Typography component="span" variant="body1" sx={{ color: colors.text.primary, fontVariantNumeric: "tabular-nums" }}>
      {day ? shortDay(day) : "—"}
    </Typography>
  </Button>
);

/** The month's title, naming its grid, with the arrows that page the row of calendars. */
const MonthHeader: FC<PickersCalendarHeaderProps> = ({ labelId }) => {
  const { month, onPrevious, onNext, canGoNext } = useContext(MonthSlotContext);
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40, mb: 0.5 }}>
      {onPrevious ? (
        <IconButton aria-label="Mes anterior" onClick={onPrevious} size="small">
          <ChevronRightIcon fontSize="small" sx={{ transform: "rotate(180deg)" }} />
        </IconButton>
      ) : (
        <Box sx={{ width: 34 }} />
      )}
      <Typography id={labelId} sx={{ fontWeight: 600 }}>
        {capitalise(monthYearName(month))}
      </Typography>
      {onNext ? (
        <IconButton aria-label="Mes siguiente" onClick={onNext} disabled={!canGoNext} size="small">
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      ) : (
        <Box sx={{ width: 34 }} />
      )}
    </Box>
  );
};

/** A day cell: the two ends selected, the days between them on a band. */
const RangeDay: FC<PickersDayProps> = (props) => {
  const { from, to } = useContext(RangeContext);
  const day = toCalendarDay(props.day as Dayjs);
  const isEnd = (!!from && compareDays(day, from) === 0) || (!!to && compareDays(day, to) === 0);
  const inBand = !!from && !!to && compareDays(day, from) > 0 && compareDays(day, to) < 0;
  return (
    <PickersDay
      {...props}
      selected={isEnd}
      sx={{
        ...(inBand && { bgcolor: colors.brand.surface, borderRadius: radii.small }),
        "&.Mui-disabled:not(.Mui-selected)": { textDecoration: "line-through" },
      }}
    />
  );
};
