import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useEffect, useMemo, useState, type FC } from "react";
import type { DateView } from "@mui/x-date-pickers/models";
import dayjs from "dayjs";
import 'dayjs/locale/es';

const MAX_JS_DATE_TIMESTAMP = 8640000000000000; // Largest posible represented Date in JS https://stackoverflow.com/questions/11526504/minimum-and-maximum-date

const GraphFilterRangeValues = {
  DAY: 'day',
  MONTH: 'month',
  YEAR: 'year',
  TOTALS: 'totals',
  DATES: 'dates'
} as const;

type GrapFilterRange = typeof GraphFilterRangeValues[keyof typeof GraphFilterRangeValues];

interface GraphFilterProps {
  handleChange: (startDate: Date, endDate: Date) => void
}

function displayStartDate(range: GrapFilterRange): boolean {
  return range !== GraphFilterRangeValues.TOTALS
}

function displayEndDate(range: GrapFilterRange): boolean {
  return range === GraphFilterRangeValues.DATES
}

function getStartDateViews(range: GrapFilterRange): DateView[] {
  switch(range) {
    case GraphFilterRangeValues.MONTH:
      return ['year', 'month']
    case GraphFilterRangeValues.YEAR:
      return ['year']
    default:
      return ['year', 'month', 'day']
  }
}

export const GraphFilter: FC<GraphFilterProps> = ({ handleChange }) => {
  const [range, setRange] = useState<GrapFilterRange>(GraphFilterRangeValues.DAY)
  const [startDate, setStartDate] = useState(dayjs())
  const [endDate, setEndDate] = useState(dayjs())
  const startDateViews = useMemo(() => getStartDateViews(range), [range])

  useEffect(() => {
    switch(range) {
      case GraphFilterRangeValues.DAY:
        handleChange(startDate.startOf('day').toDate(), startDate.endOf('day').toDate());
        break;
      case GraphFilterRangeValues.MONTH:
        handleChange(startDate.startOf('month').toDate(), startDate.endOf('month').toDate())
        break;
      case GraphFilterRangeValues.YEAR:
        handleChange(startDate.startOf('year').toDate(), startDate.endOf('year').toDate())
        break;
      case GraphFilterRangeValues.DATES:
        handleChange(startDate.startOf('day').toDate(), endDate.endOf('day').toDate())
        break;
      case GraphFilterRangeValues.TOTALS:
        handleChange(new Date(0), new Date(MAX_JS_DATE_TIMESTAMP))
    }
  }, [range, startDate, endDate] )

  return (
    <Box className="grid md:grid-flow-col gap-2 justify-center md:justify-start">
    <ToggleButtonGroup size="small" value={range} onChange={(_, value) => setRange(value)} exclusive>
      <ToggleButton value={GraphFilterRangeValues.DAY}><Typography>Día</Typography></ToggleButton>
      <ToggleButton value={GraphFilterRangeValues.MONTH}><Typography>Mes</Typography></ToggleButton>
      <ToggleButton value={GraphFilterRangeValues.YEAR}><Typography>Año</Typography></ToggleButton>
      <ToggleButton value={GraphFilterRangeValues.TOTALS}><Typography>Totales</Typography></ToggleButton>
      <ToggleButton value={GraphFilterRangeValues.DATES}><Typography>Fechas</Typography></ToggleButton>
    </ToggleButtonGroup>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        {displayStartDate(range) && <DatePicker value={startDate} maxDate={displayEndDate(range) ? endDate : undefined} onChange={(value) => setStartDate(dayjs(value))} views={startDateViews} /> }
        {displayEndDate(range) && <DatePicker value={endDate} minDate={startDate} onChange={(value) => setEndDate(dayjs(value))}/>}
      </LocalizationProvider>
    </Box>
  )
}
