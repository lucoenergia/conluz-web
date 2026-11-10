import { useId, useState, type FC, type ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { colors, radii, shadows } from "../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "../../components/EnergyFigures/energyColors";
import { formatEuros, formatKilowattHourAmount, formatKilowattHours } from "../../utils/formatEnergyFigures";
import { MEASURED_ZERO_KWH_TEXT, type ConsumptionSeriesView, type SlotView } from "./consumptionSeries";
import { slotDetail } from "./evolutionChartOptions";
import { PairedTerm } from "./PairedTerm";
import { StateMark } from "./StateMark";

// Below sm, the evolution charts turned 90° (#361): a row per slot, top to
// bottom, with horizontal bars (UI-HIS-025). The energy rows open the slot's
// detail beneath them (UI-HIS-026). Every figure and word comes from the view.

const LABEL_WIDTH = 52;
const VALUE_WIDTH = { energy: 44, savings: 60 } as const;
const GAP_TEXT = "Sin datos";
const CONSUMPTION_HEADER = "Consumo";
const UNIT = { hourly: "hora", daily: "día", monthly: "mes" } as const;

const share = (value: number | null, scaleEnd: number) => `${Math.min(Math.max((value ?? 0) / scaleEnd, 0), 1) * 100}%`;

/** The scale's quarter lines, behind the bars. */
const scaleLines = {
  backgroundImage: `repeating-linear-gradient(to right, ${colors.border.light} 0 1px, transparent 1px 25%)`,
} as const;

const rowLabelSx = (slot: SlotView) =>
  ({
    flex: "none",
    width: LABEL_WIDTH,
    color: colors.text.body,
    fontWeight: slot.startsMonthOrYear ? 600 : 400,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    textAlign: "left",
  }) as const;

const valueSx = (width: number) =>
  ({
    flex: "none",
    width,
    textAlign: "right",
    color: colors.text.primary,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  }) as const;

/** A gap: the ring and its words, where the bars would be. */
const GapBars: FC = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 19 }}>
    <StateMark kind="ring" />
    <Typography component="span" variant="caption" sx={{ color: colors.text.secondary }}>
      {GAP_TEXT}
    </Typography>
  </Box>
);

/** The row's frame: its label, its bars and its figure, with the week separator after a seventh day. */
const RowFrame: FC<{
  slot: SlotView;
  value: string;
  valueWidth: number;
  children: ReactNode;
}> = ({ slot, value, valueWidth, children }) => (
  <>
    <Typography component="span" variant="caption" sx={rowLabelSx(slot)}>
      {slot.rowLabel}
    </Typography>
    <Box aria-hidden sx={{ flex: 1, minWidth: 0, ...scaleLines }}>
      {slot.state.kind === "gap" ? <GapBars /> : children}
    </Box>
    <Typography component="span" variant="caption" sx={valueSx(valueWidth)}>
      {value}
    </Typography>
  </>
);

const rowSx = (slot: SlotView) =>
  ({
    display: "flex",
    alignItems: "center",
    gap: 1,
    py: 0.5,
    borderBottom: slot.endsWeek ? `1px solid ${colors.divider}` : "none",
  }) as const;

/** The energy row's bars: consumption, community stacked with grid, and the unused assigned energy beneath. */
const EnergyBars: FC<{ slot: SlotView; scaleEnd: number }> = ({ slot, scaleEnd }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 11 }}>
      {slot.state.kind === "measuredZero" && <StateMark kind="dot" />}
      <Box
        sx={{
          display: "flex",
          height: 11,
          width: share(slot.consumptionKWh, scaleEnd),
        }}
      >
        <Box
          sx={{
            flex: `${slot.selfConsumptionKWh ?? 0} 0 0`,
            bgcolor: ENERGY_COLORS.community,
          }}
        />
        <Box
          sx={{
            flex: `${slot.gridImportKWh ?? 0} 0 0`,
            bgcolor: ENERGY_COLORS.grid,
          }}
        />
      </Box>
      {slot.state.kind === "partial" && <StateMark kind="asterisk" />}
    </Box>
    <Box
      sx={{
        height: 6,
        width: share(slot.surplusKWh, scaleEnd),
        bgcolor: ENERGY_COLORS.exported,
      }}
    />
  </Box>
);

/** The row's name: its date and its consumption, in words a screen reader reads as one. */
function energyRowName(slot: SlotView): string {
  if (slot.state.kind === "gap" || slot.consumptionKWh === null) return `${slot.name}: ${GAP_TEXT.toLowerCase()}`;
  const value = slot.state.kind === "measuredZero" ? MEASURED_ZERO_KWH_TEXT : formatKilowattHours(slot.consumptionKWh);
  return slot.state.kind === "partial" ? `${slot.name}: ${value}, datos parciales` : `${slot.name}: ${value}`;
}

/** The savings row's name: its date and its amount. */
function savingsRowName(slot: SlotView): string {
  if (slot.state.kind === "gap" || slot.savingsEur === null) return `${slot.name}: ${GAP_TEXT.toLowerCase()}`;
  return slot.state.kind === "partial"
    ? `${slot.name}: ${formatEuros(slot.savingsEur)}, datos parciales`
    : `${slot.name}: ${formatEuros(slot.savingsEur)}`;
}

/** What the tooltip says, beneath the open row (UI-HIS-026). */
const RowDetail: FC<{ id: string; slot: SlotView; isPlantSupply: boolean }> = ({ id, slot, isPlantSupply }) => {
  const { title, lines, figures } = slotDetail(slot, isPlantSupply);
  return (
    <Box
      id={id}
      sx={{
        ml: `${LABEL_WIDTH + 8}px`,
        mt: 0.5,
        mb: 1,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        bgcolor: colors.background.paper,
        border: `1px solid ${colors.border.light}`,
        borderRadius: radii.default,
        boxShadow: shadows.dropdown,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {title}
      </Typography>
      {lines.map((line) => (
        <Typography key={line} variant="caption" sx={{ color: colors.text.body }}>
          {line}
        </Typography>
      ))}
      {figures.map(({ term, swatch, value }) => (
        <Box key={term} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            aria-hidden
            sx={{
              flex: "none",
              width: 10,
              height: 10,
              borderRadius: radii.small,
              bgcolor: swatch,
            }}
          />
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: colors.text.body }}>
            <PairedTerm term={term} />
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: colors.text.primary,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/** The energy scale above the rows: where it starts, its middle and its end, and the figures' column. */
const EnergyScale: FC<{ scaleEnd: number }> = ({ scaleEnd }) => (
  <Box
    aria-hidden
    sx={{
      display: "flex",
      gap: 1,
      pb: 0.5,
      borderBottom: `1px solid ${colors.text.muted}`,
    }}
  >
    <Box sx={{ flex: "none", width: LABEL_WIDTH }} />
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      {[0, scaleEnd / 2, scaleEnd].map((tick) => (
        <Typography
          key={tick}
          component="span"
          variant="caption"
          sx={{
            color: colors.text.secondary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatKilowattHours(tick)}
        </Typography>
      ))}
    </Box>
    <Typography component="span" variant="caption" sx={{ ...valueSx(VALUE_WIDTH.energy), color: colors.text.secondary }}>
      {CONSUMPTION_HEADER}
    </Typography>
  </Box>
);

/** Below sm, the energy chart: a button per slot that opens its detail beneath it, one at a time. */
export const EnergyEvolutionRows: FC<{
  view: ConsumptionSeriesView;
  isPlantSupply: boolean;
}> = ({ view, isPlantSupply }) => {
  const [open, setOpen] = useState<string | null>(null);
  const detailId = useId();
  const scaleEnd = view.rowScale.energyKWh;
  return (
    <Box>
      <EnergyScale scaleEnd={scaleEnd} />
      <Box component="ul" aria-label={`Tu energía por ${UNIT[view.granularity]}`} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {view.slots.map((slot) => {
          const isOpen = open === slot.key;
          const id = `${detailId}-${slot.key}`;
          return (
            <Box component="li" key={slot.key}>
              <ButtonBase
                aria-label={energyRowName(slot)}
                aria-expanded={isOpen}
                aria-controls={isOpen ? id : undefined}
                onClick={() => setOpen(isOpen ? null : slot.key)}
                sx={{
                  ...rowSx(slot),
                  width: "100%",
                  bgcolor: isOpen ? colors.brand.surface : "transparent",
                  font: "inherit",
                }}
              >
                <RowFrame
                  slot={slot}
                  value={slot.consumptionKWh === null ? "—" : formatKilowattHourAmount(slot.consumptionKWh)}
                  valueWidth={VALUE_WIDTH.energy}
                >
                  <EnergyBars slot={slot} scaleEnd={scaleEnd} />
                </RowFrame>
              </ButtonBase>
              {isOpen && <RowDetail id={id} slot={slot} isPlantSupply={isPlantSupply} />}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/** Below sm, the savings chart: a row per slot, with its bar and its amount. */
export const SavingsEvolutionRows: FC<{ view: ConsumptionSeriesView }> = ({ view }) => {
  const scaleEnd = view.rowScale.savingsEur;
  return (
    <Box component="ul" aria-label={`Tu ahorro estimado por ${UNIT[view.granularity]}`} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {view.slots.map((slot) => (
        <Box component="li" key={slot.key} aria-label={savingsRowName(slot)} sx={rowSx(slot)}>
          <RowFrame slot={slot} value={slot.savingsEur === null ? "—" : formatEuros(slot.savingsEur)} valueWidth={VALUE_WIDTH.savings}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                height: 14,
              }}
            >
              {slot.savingsEur === 0 && <StateMark kind="dot" />}
              <Box
                sx={{
                  height: 10,
                  width: share(slot.savingsEur, scaleEnd),
                  bgcolor: SAVINGS_COLOR,
                }}
              />
              {slot.state.kind === "partial" && <StateMark kind="asterisk" />}
            </Box>
          </RowFrame>
        </Box>
      ))}
    </Box>
  );
};
