import { Box, Button, ButtonGroup, Paper } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { alpha } from "@mui/material/styles";
import { shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useEffect, useMemo, useState, type FC } from "react";
import type { DateView } from "@mui/x-date-pickers/models";
import dayjs from "dayjs";
import "dayjs/locale/es";

const GraphFilterRangeValues = {
  DAY: "day",
  MONTH: "month",
  YEAR: "year",
  TOTALS: "totals",
  DATES: "dates",
} as const;

type GrapFilterRange = (typeof GraphFilterRangeValues)[keyof typeof GraphFilterRangeValues];

interface GraphFilterProps {
  handleChange: (startDate: Date, endDate: Date) => void;
}

function displayStartDate(range: GrapFilterRange): boolean {
  return range !== GraphFilterRangeValues.TOTALS;
}

function displayEndDate(range: GrapFilterRange): boolean {
  return range === GraphFilterRangeValues.DATES;
}

function getStartDateViews(range: GrapFilterRange): DateView[] {
  switch (range) {
    case GraphFilterRangeValues.MONTH:
      return ["year", "month"];
    case GraphFilterRangeValues.YEAR:
      return ["year"];
    default:
      return ["year", "month", "day"];
  }
}

export const GraphFilter: FC<GraphFilterProps> = ({ handleChange }) => {
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

  return (
    <Paper
      elevation={0}
      sx={sxStyles.softPanel}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: { xs: "center", sm: "flex-start" },
        }}
      >
        <ButtonGroup
          variant="contained"
          sx={(theme) => ({
            boxShadow: shadows.medium,
            width: { xs: "100%", sm: "auto" },
            flexDirection: { xs: "column", sm: "row" },
            "& .MuiButtonGroup-grouped": {
              width: { xs: "100%", sm: "auto" },
            },
            "& .MuiButton-root": {
              fontSize: { xs: "0.875rem", sm: "0.9375rem" },
              fontWeight: 500,
              lineHeight: 1.46667,
              padding: { xs: "0.5rem 1rem", sm: "0.4375rem 1.0625rem" },
              minWidth: { xs: "100%", sm: "64px" },
              transition: "all 0.2s",
              border: `1px solid ${theme.palette.primary.main}`,
              "&:hover": {
                bgcolor: theme.palette.primary.main,
                color: "white",
                boxShadow: `0 4px 8px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
              },
            },
          })}
        >
          <Button
            onClick={() => setRange(GraphFilterRangeValues.DAY)}
            sx={(theme) => ({
              bgcolor: range === GraphFilterRangeValues.DAY ? theme.palette.primary.main : "white",
              color: range === GraphFilterRangeValues.DAY ? "white" : theme.palette.primary.main,
            })}
          >
            Día
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.MONTH)}
            sx={(theme) => ({
              bgcolor: range === GraphFilterRangeValues.MONTH ? theme.palette.primary.main : "white",
              color: range === GraphFilterRangeValues.MONTH ? "white" : theme.palette.primary.main,
            })}
          >
            Mes
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.YEAR)}
            sx={(theme) => ({
              bgcolor: range === GraphFilterRangeValues.YEAR ? theme.palette.primary.main : "white",
              color: range === GraphFilterRangeValues.YEAR ? "white" : theme.palette.primary.main,
            })}
          >
            Año
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.TOTALS)}
            sx={(theme) => ({
              bgcolor: range === GraphFilterRangeValues.TOTALS ? theme.palette.primary.main : "white",
              color: range === GraphFilterRangeValues.TOTALS ? "white" : theme.palette.primary.main,
            })}
          >
            Totales
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.DATES)}
            sx={(theme) => ({
              bgcolor: range === GraphFilterRangeValues.DATES ? theme.palette.primary.main : "white",
              color: range === GraphFilterRangeValues.DATES ? "white" : theme.palette.primary.main,
            })}
          >
            Fechas
          </Button>
        </ButtonGroup>

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
                      fontSize: "0.9375rem",
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
                      fontSize: "0.9375rem",
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
      </Box>
    </Paper>
  );
};
