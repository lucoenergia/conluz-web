import { useEffect, useMemo, useState } from "react";
import type { DateView } from "@mui/x-date-pickers/models";
import dayjs from "dayjs";

export const GraphFilterRangeValues = {
  DAY: "day",
  MONTH: "month",
  YEAR: "year",
  TOTALS: "totals",
  DATES: "dates",
} as const;

export type GrapFilterRange = (typeof GraphFilterRangeValues)[keyof typeof GraphFilterRangeValues];

export function displayStartDate(range: GrapFilterRange): boolean {
  return range !== GraphFilterRangeValues.TOTALS;
}

export function displayEndDate(range: GrapFilterRange): boolean {
  return range === GraphFilterRangeValues.DATES;
}

export function getStartDateViews(range: GrapFilterRange): DateView[] {
  switch (range) {
    case GraphFilterRangeValues.MONTH:
      return ["year", "month"];
    case GraphFilterRangeValues.YEAR:
      return ["year"];
    default:
      return ["year", "month", "day"];
  }
}

/**
 * The period a graph filter selects: the range kind, the dates the user picked,
 * and the interval those amount to, reported through `handleChange` whenever
 * any of them moves. Shared by every control that selects a graph's period, so
 * they all derive it in one way.
 */
export function useGraphFilterRange(handleChange: (startDate: Date, endDate: Date) => void) {
  const [range, setRange] = useState<GrapFilterRange>(GraphFilterRangeValues.DAY);
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs());
  const startDateViews = useMemo(() => getStartDateViews(range), [range]);

  useEffect(() => {
    switch (range) {
      case GraphFilterRangeValues.DAY:
        handleChange(startDate.startOf("day").toDate(), startDate.endOf("day").toDate());
        break;
      case GraphFilterRangeValues.MONTH:
        handleChange(startDate.startOf("month").toDate(), startDate.endOf("month").toDate());
        break;
      case GraphFilterRangeValues.YEAR:
        handleChange(startDate.startOf("year").toDate(), startDate.endOf("year").toDate());
        break;
      case GraphFilterRangeValues.DATES:
        handleChange(startDate.startOf("day").toDate(), endDate.endOf("day").toDate());
        break;
      case GraphFilterRangeValues.TOTALS:
        handleChange(new Date('2000-01-01'), new Date());
    }
  }, [range, startDate, endDate]);


  return { range, setRange, startDate, setStartDate, endDate, setEndDate, startDateViews };
}

export type GraphFilterRangeState = ReturnType<typeof useGraphFilterRange>;
