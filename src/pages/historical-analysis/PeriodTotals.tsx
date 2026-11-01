import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { formatEuros, formatKilowattHours } from "../../utils/formatEnergyFigures";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "../home/member/energyColors";
import { EstimatedPriceLabel } from "../home/member/EstimatedPriceLabel";
import type { PeriodEnergyMetrics } from "./usePeriodEnergyMetrics";

interface Tile {
  label: string;
  value: string;
  /** The concept's mark; the figure is drawn in a text-safe tone of the same hue. */
  mark: string;
  figureColor: string;
  note: ReactNode;
}

/**
 * The period's four totals (#249), each a field of the response
 * (UI-HIS-010). Plain words under each label: the technical terms appear only
 * in the period card's tooltip (UI-HIS-011).
 */
export const PeriodTotals: FC<{ metrics: PeriodEnergyMetrics; isPlantSupply: boolean }> = ({ metrics, isPlantSupply }) => {
  const { energy, savings } = metrics;
  const tiles: Tile[] = [
    {
      label: "De la comunidad",
      value: formatKilowattHours(energy.selfConsumptionKWh),
      mark: ENERGY_COLORS.community,
      figureColor: colors.success.main,
      note: "Energía asignada que usaste",
    },
    {
      label: "De la red",
      value: formatKilowattHours(energy.gridImportKWh),
      mark: ENERGY_COLORS.grid,
      figureColor: ENERGY_COLORS.grid,
      note: "Comprada a tu comercializadora",
    },
    {
      label: "Se fue a la red",
      value: formatKilowattHours(energy.surplusKWh),
      mark: ENERGY_COLORS.exported,
      figureColor: ENERGY_COLORS.exported,
      note: isPlantSupply ? "Siempre 0 en el punto de la planta" : "Se te asignó y no la usaste",
    },
    {
      label: "Ahorro estimado",
      value: savings.amountEur === null ? "—" : formatEuros(savings.amountEur),
      mark: SAVINGS_COLOR,
      figureColor: SAVINGS_COLOR,
      // Keyed on estimatedPrice alone, whatever tariffSource says (see EstimatedPriceLabel).
      note: <EstimatedPriceLabel estimatedPrice={savings.estimatedPrice} />,
    },
  ];

  return (
    <Box
      component="ul"
      aria-label="Totales del periodo"
      sx={{
        listStyle: "none",
        p: 0,
        m: 0,
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
      }}
    >
      {tiles.map((tile) => (
        <Box component="li" key={tile.label} sx={{ ...sxStyles.softPanel, p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "2px", flexShrink: 0, bgcolor: tile.mark }} />
            <Typography variant="body2" component="p" sx={{ color: colors.text.body }}>
              {tile.label}
            </Typography>
          </Box>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700, color: tile.figureColor, fontVariantNumeric: "tabular-nums" }}>
            {tile.value}
          </Typography>
          {typeof tile.note === "string" ? (
            <Typography variant="caption" component="p" sx={{ color: colors.text.subtle }}>
              {tile.note}
            </Typography>
          ) : (
            tile.note
          )}
        </Box>
      ))}
    </Box>
  );
};
