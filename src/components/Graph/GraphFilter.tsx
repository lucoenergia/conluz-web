import { Box, Button, ButtonGroup, Paper } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useEffect, useMemo, useState, type FC } from "react";
import type { DateView } from "@mui/x-date-pickers/models";
import dayjs from "dayjs";
import "dayjs/locale/es";

const MAX_JS_DATE_TIMESTAMP = 8640000000000000; // Largest posible represented Date in JS https://stackoverflow.com/questions/11526504/minimum-and-maximum-date

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
        handleChange(new Date(0), new Date(MAX_JS_DATE_TIMESTAMP));
    }
  }, [range, startDate, endDate]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 2, sm: 3 },
        bgcolor: "white",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
        width: "100%",
      }}
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
          sx={{
            boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
            width: { xs: "100%", sm: "auto" },
            flexDirection: { xs: "column", sm: "row" },
            "& .MuiButtonGroup-grouped": {
              width: { xs: "100%", sm: "auto" },
            },
            "& .MuiButton-root": {
              textTransform: "none",
              fontSize: { xs: "0.875rem", sm: "0.9375rem" },
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.46667,
              padding: { xs: "0.5rem 1rem", sm: "0.4375rem 1.0625rem" },
              minWidth: { xs: "100%", sm: "64px" },
              transition: "all 0.2s",
              bgcolor: range === GraphFilterRangeValues.DAY ? "#667eea" : "white",
              color: range === GraphFilterRangeValues.DAY ? "white" : "#667eea",
              border: "1px solid #667eea",
              "&:hover": {
                bgcolor: "#667eea",
                color: "white",
                boxShadow: "0 4px 8px 0 rgba(102,126,234,0.3)",
              },
            },
          }}
        >
          <Button
            onClick={() => setRange(GraphFilterRangeValues.DAY)}
            sx={{
              bgcolor: range === GraphFilterRangeValues.DAY ? "#667eea !important" : "white !important",
              color: range === GraphFilterRangeValues.DAY ? "white !important" : "#667eea !important",
            }}
          >
            Día
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.MONTH)}
            sx={{
              bgcolor: range === GraphFilterRangeValues.MONTH ? "#667eea !important" : "white !important",
              color: range === GraphFilterRangeValues.MONTH ? "white !important" : "#667eea !important",
            }}
          >
            Mes
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.YEAR)}
            sx={{
              bgcolor: range === GraphFilterRangeValues.YEAR ? "#667eea !important" : "white !important",
              color: range === GraphFilterRangeValues.YEAR ? "white !important" : "#667eea !important",
            }}
          >
            Año
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.TOTALS)}
            sx={{
              bgcolor: range === GraphFilterRangeValues.TOTALS ? "#667eea !important" : "white !important",
              color: range === GraphFilterRangeValues.TOTALS ? "white !important" : "#667eea !important",
            }}
          >
            Totales
          </Button>
          <Button
            onClick={() => setRange(GraphFilterRangeValues.DATES)}
            sx={{
              bgcolor: range === GraphFilterRangeValues.DATES ? "#667eea !important" : "white !important",
              color: range === GraphFilterRangeValues.DATES ? "white !important" : "#667eea !important",
            }}
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
                      borderRadius: "6px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.9375rem",
                      height: "40px",
                      "&:hover fieldset": {
                        borderColor: "#667eea",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#667eea",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#667eea",
                    },
                  },
                },
                popper: {
                  sx: {
                    "& .MuiPickersYear-yearButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": {
                        backgroundColor: "#5568d3 !important",
                      },
                      "&:focus": {
                        backgroundColor: "#667eea !important",
                      },
                    },
                    "& .MuiPickersMonth-monthButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": {
                        backgroundColor: "#5568d3 !important",
                      },
                      "&:focus": {
                        backgroundColor: "#667eea !important",
                      },
                    },
                    "& .MuiPickersDay-root.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": {
                        backgroundColor: "#5568d3 !important",
                      },
                      "&:focus": {
                        backgroundColor: "#667eea !important",
                      },
                    },
                    "& .MuiPickersYear-yearButton:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                    "& .MuiPickersMonth-monthButton:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                    "& .MuiPickersDay-root:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                  },
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
                      borderRadius: "6px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.9375rem",
                      height: "40px",
                      "&:hover fieldset": {
                        borderColor: "#667eea",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#667eea",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#667eea",
                    },
                  },
                },
                popper: {
                  sx: {
                    "& .MuiPickersYear-yearButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": {
                        backgroundColor: "#5568d3 !important",
                      },
                      "&:focus": {
                        backgroundColor: "#667eea !important",
                      },
                    },
                    "& .MuiPickersMonth-monthButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": {
                        backgroundColor: "#5568d3 !important",
                      },
                      "&:focus": {
                        backgroundColor: "#667eea !important",
                      },
                    },
                    "& .MuiPickersDay-root.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": {
                        backgroundColor: "#5568d3 !important",
                      },
                      "&:focus": {
                        backgroundColor: "#667eea !important",
                      },
                    },
                    "& .MuiPickersYear-yearButton:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                    "& .MuiPickersMonth-monthButton:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                    "& .MuiPickersDay-root:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                  },
                },
              }}
            />
          )}
        </LocalizationProvider>
      </Box>
    </Paper>
  );
};
