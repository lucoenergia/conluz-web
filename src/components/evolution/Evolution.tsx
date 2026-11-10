import type { FC, ReactNode } from "react";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { colors } from "../../theme/tokens";
import { NeutralNotice } from "../EnergyFigures/NeutralNotice";
import { swatch } from "../EnergyFigures/energyColors";
import { SeriesLegend, type LegendItem } from "./SeriesLegend";
import { EnergyEvolutionChart, SavingsEvolutionChart } from "./EvolutionCharts";
import { EnergyEvolutionRows, SavingsEvolutionRows } from "./EvolutionRows";
import { StateMark, type StateMarkKind } from "./StateMark";
import type { EvolutionCopy, EvolutionView, SeriesLook } from "./evolutionSeries";

/** A legend group: its heading, then its swatches. */
const LegendGroup: FC<{ heading: string; items: LegendItem[] }> = ({ heading, items }) => (
  <Box role="group" aria-label={heading} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, rowGap: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
      {heading}:
    </Typography>
    <SeriesLegend items={items} />
  </Box>
);

const MARKER_KEY: { kind: StateMarkKind; label: string }[] = [
  { kind: "ring", label: "Sin datos: no hay lecturas" },
  { kind: "dot", label: "Cero medido" },
  { kind: "asterisk", label: "Datos parciales" },
];

/** What each mark on the charts means, in words. */
const MarkerKey: FC = () => (
  <Box
    component="ul"
    aria-label="Marcas de estado"
    sx={{ listStyle: "none", p: 0, m: 0, pt: 1.5, borderTop: `1px solid ${colors.border.light}`, display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}
  >
    {MARKER_KEY.map(({ kind, label }) => (
      <Box component="li" key={kind} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <StateMark kind={kind} />
        <Typography variant="body2" sx={{ color: colors.text.body }}>
          {label}
        </Typography>
      </Box>
    ))}
  </Box>
);

export interface EvolutionProps {
  view: EvolutionView<string>;
  look: SeriesLook<string>;
  copy: EvolutionCopy;
  /** The page's own lines about the scope, in every tooltip and row detail. */
  extraLines: readonly string[];
  /** The price the savings were estimated with, shown above the savings chart. */
  priceLabel: ReactNode;
}

/**
 * The body of an evolution card (#250, #401): the period's coverage and
 * notices, the energy chart with its legend and caption, the savings chart
 * with its price, and the key to the marks. From sm up the charts are
 * charts; below it, rows, and the page scrolls only vertically (UI-HIS-025).
 * The page puts it in its card, under `copy.title`.
 */
export const Evolution: FC<EvolutionProps> = ({ view, look, copy, extraLines, priceLabel }) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  const segment = (key: string) => look.segments.find((candidate) => candidate.key === key)!;
  return (
    <>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        {view.coverageText}
      </Typography>
      {view.gapsNotice && <NeutralNotice>{view.gapsNotice}</NeutralNotice>}
      {view.partialNotice && <NeutralNotice>{view.partialNotice}</NeutralNotice>}
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 4, rowGap: 0.5 }}>
        {copy.legendGroups.map(({ heading, segments }) => (
          <LegendGroup
            key={heading}
            heading={heading}
            items={segments.map(segment).map(({ label, technicalTerm, color }) => ({ label, companion: technicalTerm, swatch: swatch.solid(color) }))}
          />
        ))}
      </Box>
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {isWide ? copy.caption.wide : copy.caption.narrow}
      </Typography>
      {isWide ? (
        <EnergyEvolutionChart view={view} look={look} extraLines={extraLines} />
      ) : (
        <EnergyEvolutionRows view={view} look={look} copy={copy} extraLines={extraLines} />
      )}
      <SeriesLegend items={[{ label: look.savings.label, swatch: swatch.solid(look.savings.color) }]} />
      {priceLabel}
      {isWide ? <SavingsEvolutionChart view={view} look={look} extraLines={extraLines} /> : <SavingsEvolutionRows view={view} look={look} copy={copy} />}
      <MarkerKey />
    </>
  );
};
