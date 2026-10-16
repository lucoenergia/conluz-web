import { alpha } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { FC } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { fontSizes } from "../../theme/tokens";
import { displayEndDate, displayStartDate, type GraphFilterRangeState } from "./useGraphFilterRange";

/** The date pickers of a graph filter: the start date, and the end date for a custom range. */
export const GraphFilterDates: FC<{ state: GraphFilterRangeState }> = ({
  state: { range, startDate, setStartDate, endDate, setEndDate, startDateViews },
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
    {displayStartDate(range) && (
      <DatePicker
        value={startDate}
        maxDate={displayEndDate(range) ? endDate : undefined}
        onChange={(value) => setStartDate(dayjs(value))}
        views={startDateViews}
        slotProps={{
          textField: {
            size: "small",
            sx: {
              "& .MuiOutlinedInput-root": {
                fontSize: fontSizes.lg,
                height: "40px",
              },
            },
          },
          popper: {
            sx: (theme) => ({
              "& .MuiPickersYear-yearButton.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersMonth-monthButton.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersDay-root.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersYear-yearButton:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "& .MuiPickersMonth-monthButton:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "& .MuiPickersDay-root:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
            }),
          },
        }}
      />
    )}
    {displayEndDate(range) && (
      <DatePicker
        value={endDate}
        minDate={startDate}
        onChange={(value) => setEndDate(dayjs(value))}
        slotProps={{
          textField: {
            size: "small",
            sx: {
              "& .MuiOutlinedInput-root": {
                fontSize: fontSizes.lg,
                height: "40px",
              },
            },
          },
          popper: {
            sx: (theme) => ({
              "& .MuiPickersYear-yearButton.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersMonth-monthButton.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersDay-root.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersYear-yearButton:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "& .MuiPickersMonth-monthButton:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "& .MuiPickersDay-root:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
            }),
          },
        }}
      />
    )}
  </LocalizationProvider>
);
