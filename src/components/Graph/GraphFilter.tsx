import { Box, Button, ButtonGroup, Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { shadows, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import type { FC } from "react";
import { GraphFilterDates } from "./GraphFilterDates";
import { GraphFilterRangeValues, useGraphFilterRange } from "./useGraphFilterRange";

interface GraphFilterProps {
  handleChange: (startDate: Date, endDate: Date) => void;
}

export const GraphFilter: FC<GraphFilterProps> = ({ handleChange }) => {
  const state = useGraphFilterRange(handleChange);
  const { range, setRange } = state;

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
              fontSize: { xs: fontSizes.md, sm: fontSizes.lg },
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

        <GraphFilterDates state={state} />
      </Box>
    </Paper>
  );
};
