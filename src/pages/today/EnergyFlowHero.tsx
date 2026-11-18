import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import SolarPowerRoundedIcon from "@mui/icons-material/SolarPowerRounded";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors, radii } from "../../theme/tokens";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { conduitThickness, type HeroMode } from "./todayState";
import { PLANT_NODE_LABEL, SUPPLY_NODE_LABEL, flowingCaption, staleCaption, stalePlantPower } from "./todayTexts";

export interface EnergyFlowHeroProps {
  mode: HeroMode;
  /** The power reaching the supply, in kW; null when there is no current value. */
  powerKW: number | null;
  /** The community's production in the same slot, in kW; null hides the plant node's second line. */
  plantPowerKW: number | null;
  /** The supply's name, or its address when it has none. */
  supplyLabel: string;
  /** "13:05": set while the data is stale, so the values read "a las 13:05". */
  staleAt?: string;
  /** Reserved for the particle animation (#432 leaves it out): the hero is static. */
  animated?: boolean;
}

// The base canvas every coordinate below is drawn on, scaled to the hero's width.
const WIDTH = 340;
const HEIGHT = 316;
const CENTER_X = 170;
const PLANT_Y = 52;
const SUPPLY_Y = 250;
const NODE_RADIUS = 28;
const GAP = 6;
const CONDUIT_START = PLANT_Y + NODE_RADIUS + GAP;
const CONDUIT_END = SUPPLY_Y - NODE_RADIUS - GAP;
const CHEVRON_SPACING = 26;
const CHEVRON_MIN_THICKNESS = 7;
const DASHED_WIDTH = 2;
const DASH = "4 6";

/** A position on the base canvas, as a percentage of the hero's box. */
const left = (x: number) => `${(x / WIDTH) * 100}%`;
const top = (y: number) => `${(y / HEIGHT) * 100}%`;

/**
 * Where today's energy comes from and where it goes (UI-TDY-006): the
 * community's plant above, the member's supply below, and a conduit between
 * them whose thickness follows the power on an absolute scale. With no power
 * flowing, or nothing to show yet, the conduit is a thin dashed line. Purely
 * illustrative: every value it shows is also in the status sentence and the
 * figures, so it is hidden from assistive technology.
 */
export const EnergyFlowHero: FC<EnergyFlowHeroProps> = ({ mode, powerKW, plantPowerKW, supplyLabel, staleAt }) => {
  const flowing = mode === "flowing" && powerKW !== null && powerKW > 0;
  const unavailable = mode === "unavailable";
  const plantSecondLine =
    mode === "waiting" || unavailable || plantPowerKW === null
      ? null
      : staleAt
        ? stalePlantPower(formatKilowatts(plantPowerKW), staleAt)
        : formatKilowatts(plantPowerKW);

  return (
    <Box
      aria-hidden
      data-testid="energy-flow-hero"
      data-mode={mode}
      sx={{ position: "relative", width: "100%", maxWidth: 360, aspectRatio: `${WIDTH} / ${HEIGHT}`, mx: "auto" }}
    >
      <Box component="svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {flowing ? <FlowingConduit powerKW={powerKW} /> : <DashedConduit />}
        <circle
          data-testid="plant-node"
          cx={CENTER_X}
          cy={PLANT_Y}
          r={NODE_RADIUS}
          fill={unavailable ? colors.background.surface : ENERGY_COLORS.assigned}
          stroke={unavailable ? colors.border.light : ENERGY_COLORS.assigned}
          strokeWidth={2}
        />
        <circle
          data-testid="supply-node"
          cx={CENTER_X}
          cy={SUPPLY_Y}
          r={NODE_RADIUS}
          fill={colors.background.paper}
          stroke={colors.text.primary}
          strokeWidth={2}
        />
      </Box>

      <NodeIcon y={PLANT_Y} color={unavailable ? colors.text.placeholder : colors.background.paper}>
        <SolarPowerRoundedIcon sx={{ fontSize: 28 }} />
      </NodeIcon>
      <NodeIcon y={SUPPLY_Y} color={colors.text.primary}>
        <ElectricMeterIcon sx={{ fontSize: 28 }} />
      </NodeIcon>

      <NodeLabel y={PLANT_Y} caption={PLANT_NODE_LABEL} value={plantSecondLine} />
      <NodeLabel y={SUPPLY_Y} caption={SUPPLY_NODE_LABEL} value={supplyLabel} />

      {flowing && (
        <Box
          sx={{
            position: "absolute",
            left: left(CENTER_X),
            top: top((CONDUIT_START + CONDUIT_END) / 2),
            transform: "translate(-50%, -50%)",
            px: 1.5,
            py: 0.5,
            borderRadius: radii.default,
            bgcolor: colors.background.paper,
            border: `1px solid ${colors.border.light}`,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          <Typography variant="h6" component="p" sx={{ fontWeight: 700, lineHeight: 1.2, color: colors.text.primary }}>
            {formatKilowatts(powerKW)}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: colors.text.secondary }}>
            {staleAt ? staleCaption(staleAt) : flowingCaption}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

/** The solid conduit: thickness from the power, white chevrons from 7 px, and the arrowhead at "Tu punto". */
const FlowingConduit: FC<{ powerKW: number }> = ({ powerKW }) => {
  const thickness = conduitThickness(powerKW);
  const arrowLength = Math.max(9, 1.2 * thickness);
  const arrowHalfWidth = Math.max(6, 0.9 * thickness);
  const lineEnd = CONDUIT_END - arrowLength;
  const chevronHalfWidth = Math.min(4.5, Math.max(2.5, 0.32 * thickness));
  const chevrons: number[] = [];
  if (thickness >= CHEVRON_MIN_THICKNESS) {
    for (let y = CONDUIT_START + CHEVRON_SPACING / 2; y <= lineEnd - chevronHalfWidth; y += CHEVRON_SPACING) chevrons.push(y);
  }
  return (
    <g data-testid="conduit" data-style="solid" data-thickness={thickness}>
      <line x1={CENTER_X} y1={CONDUIT_START} x2={CENTER_X} y2={lineEnd} stroke={ENERGY_COLORS.assigned} strokeWidth={thickness} />
      {chevrons.map((y) => (
        <polyline
          key={y}
          data-testid="chevron"
          points={`${CENTER_X - chevronHalfWidth},${y - chevronHalfWidth} ${CENTER_X},${y} ${CENTER_X + chevronHalfWidth},${y - chevronHalfWidth}`}
          fill="none"
          stroke={colors.background.paper}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <Arrowhead length={arrowLength} halfWidth={arrowHalfWidth} color={ENERGY_COLORS.assigned} />
    </g>
  );
};

/** No power flowing, or nothing to show yet: a thin dashed line in the inactive colour. */
const DashedConduit: FC = () => (
  <g data-testid="conduit" data-style="dashed">
    <line
      x1={CENTER_X}
      y1={CONDUIT_START}
      x2={CENTER_X}
      y2={CONDUIT_END - 7}
      stroke={colors.border.inactive}
      strokeWidth={DASHED_WIDTH}
      strokeDasharray={DASH}
    />
    <Arrowhead length={7} halfWidth={4.5} color={colors.border.inactive} />
  </g>
);

const Arrowhead: FC<{ length: number; halfWidth: number; color: string }> = ({ length, halfWidth, color }) => (
  <polygon
    points={`${CENTER_X - halfWidth},${CONDUIT_END - length} ${CENTER_X + halfWidth},${CONDUIT_END - length} ${CENTER_X},${CONDUIT_END}`}
    fill={color}
  />
);

const NodeIcon: FC<{ y: number; color: string; children: ReactNode }> = ({ y, color, children }) => (
  <Box
    sx={{
      position: "absolute",
      left: left(CENTER_X),
      top: top(y),
      transform: "translate(-50%, -50%)",
      display: "flex",
      color,
    }}
  >
    {children}
  </Box>
);

/** A node's caption and value, to its right; long names wrap rather than run off the hero. */
const NodeLabel: FC<{ y: number; caption: string; value: string | null }> = ({ y, caption, value }) => (
  <Box
    sx={{
      position: "absolute",
      left: left(CENTER_X + NODE_RADIUS + 12),
      right: 0,
      top: top(y),
      transform: "translateY(-50%)",
      minWidth: 0,
    }}
  >
    <Typography variant="caption" component="p" sx={{ color: colors.text.secondary, lineHeight: 1.3 }}>
      {caption}
    </Typography>
    {value !== null && (
      <Typography
        variant="body2"
        component="p"
        sx={{
          fontWeight: 600,
          color: colors.text.primary,
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    )}
  </Box>
);
