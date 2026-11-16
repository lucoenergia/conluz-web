import { useId, useState, type ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { colors, radii, shadows } from "../../theme/tokens";
import { formatEuros, formatKilowattHourAmount, formatKilowattHours } from "../../utils/formatEnergyFigures";
import type { SlotDetail } from "./evolutionChartOptions";
import {
  MEASURED_ZERO_KWH_TEXT,
  groupsOf,
  groupSum,
  type EvolutionSlot,
  type SegmentDefinition,
  type SeriesLook,
  type SlotState,
} from "./evolutionSeries";
import { PairedTerm } from "./PairedTerm";
import { StateMark, type StateMarkKind } from "./StateMark";

// Below sm, a bar chart turned 90° (#361, #425): a row per slot, top to
// bottom, with horizontal bars (UI-HIS-025, UI-CHT-001). The energy rows open
// the slot's detail beneath them (UI-HIS-026). Every figure and every word
// comes from the caller: the evolution card passes its view and copy, the
// member home its own view models.

const LABEL_WIDTH = 52;
const VALUE_WIDTH = { energy: 44, savings: 60 } as const;
const GAP_TEXT = "Sin datos";

const share = (value: number | null, scaleEnd: number) => `${Math.min(Math.max((value ?? 0) / scaleEnd, 0), 1) * 100}%`;

/** The scale's quarter lines, behind the bars. */
const scaleLines = {
  backgroundImage: `repeating-linear-gradient(to right, ${colors.border.light} 0 1px, transparent 1px 25%)`,
} as const;

/** What a row reads from a slot: the evolution card's slots carry it, and so can any other chart's. */
export type RowSlot<K extends string = string> = Pick<
  EvolutionSlot<K>,
  "key" | "name" | "rowLabel" | "startsMonthOrYear" | "endsWeek" | "state" | "values" | "total" | "savingsEur" | "savingsZero"
>;

type PartialState = Extract<SlotState, { kind: "partial" }>;

/** How a list's rows mark their states. Each default is what the evolution card draws. */
interface RowMarks {
  /** What a gap reads beside its ring. "Sin datos" by default. */
  gapText?: string;
  /** What follows a partial slot's bar. The asterisk by default. */
  partialMark?: (state: PartialState) => ReactNode;
}

/** A mark some rows carry, such as the member home's best hours: never colour alone. */
export interface RowMark<S> {
  applies: (slot: S) => boolean;
  /** Drawn after the row's label, hidden from assistive technology: `text` says the same. */
  icon: ReactNode;
  /** Appended to the row's name: "8 h: …, mejor hora". */
  text: string;
  /** The row's background. */
  tint: string;
}

const rowLabelSx = (slot: RowSlot) =>
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

const asterisk = () => <StateMark kind="asterisk" />;

/** A gap: the ring and its words, where the bars would be. */
const GapBars = ({ text }: { text: string }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 19 }}>
    <StateMark kind="ring" />
    <Typography component="span" variant="caption" sx={{ color: colors.text.secondary }}>
      {text}
    </Typography>
  </Box>
);

/** The row's frame: its label, its bars and its figure, with the week separator after a seventh day. */
const RowFrame = ({
  slot,
  value,
  valueWidth,
  gapText,
  icon,
  children,
}: {
  slot: RowSlot;
  value: string;
  valueWidth: number;
  gapText: string;
  /** The row mark's icon, when the row carries one. */
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <>
    {icon ? (
      <Typography
        component="span"
        variant="caption"
        sx={{ ...rowLabelSx(slot), display: "inline-flex", alignItems: "center", gap: 0.5 }}
      >
        {slot.rowLabel}
        <Box component="span" aria-hidden sx={{ display: "inline-flex" }}>
          {icon}
        </Box>
      </Typography>
    ) : (
      <Typography component="span" variant="caption" sx={rowLabelSx(slot)}>
        {slot.rowLabel}
      </Typography>
    )}
    <Box aria-hidden sx={{ flex: 1, minWidth: 0, ...scaleLines }}>
      {slot.state.kind === "gap" ? <GapBars text={gapText} /> : children}
    </Box>
    <Typography component="span" variant="caption" sx={valueSx(valueWidth)}>
      {value}
    </Typography>
  </>
);

const rowSx = (slot: RowSlot) =>
  ({
    display: "flex",
    alignItems: "center",
    gap: 1,
    py: 0.5,
    borderBottom: slot.endsWeek ? `1px solid ${colors.divider}` : "none",
  }) as const;

/** A group's segments side by side in one bar, each as wide as its share of the group. */
const GroupSegments = ({ slot, group }: { slot: RowSlot; group: readonly SegmentDefinition<string>[] }) => (
  <>
    {group.map(({ key, color }) => (
      <Box
        key={key}
        sx={{
          flex: `${slot.values[key] ?? 0} 0 0`,
          bgcolor: color,
        }}
      />
    ))}
  </>
);

/** A bar after the first: one segment, or its segments side by side, with its own mark before it if it has one. */
const ThinBar = ({
  slot,
  group,
  scaleEnd,
  mark,
}: {
  slot: RowSlot;
  group: readonly SegmentDefinition<string>[];
  scaleEnd: number;
  mark: StateMarkKind | null;
}) => {
  const bar =
    group.length === 1 ? (
      <Box
        sx={{
          height: 6,
          width: share(groupSum(slot, group), scaleEnd),
          bgcolor: group[0].color,
        }}
      />
    ) : (
      <Box sx={{ display: "flex", height: 6, width: share(groupSum(slot, group), scaleEnd) }}>
        <GroupSegments slot={slot} group={group} />
      </Box>
    );
  if (!mark) return bar;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 10 }}>
      <StateMark kind={mark} />
      {bar}
    </Box>
  );
};

/** The evolution card's bar marks: a measured zero's dot before the first bar, none on the others. */
const defaultBarMark = (slot: RowSlot, groupIndex: number): StateMarkKind | null =>
  groupIndex === 0 && slot.state.kind === "measuredZero" ? "dot" : null;

/** The energy row's bars: the first group stacked in the thick bar, every other group in a thin bar beneath it. */
const EnergyBars = <S extends RowSlot>({
  slot,
  look,
  scaleEnd,
  barMark,
  partialMark,
}: {
  slot: S;
  look: SeriesLook<string>;
  scaleEnd: number;
  barMark: (slot: S, groupIndex: number) => StateMarkKind | null;
  partialMark: (state: PartialState) => ReactNode;
}) => {
  const [first, ...others] = groupsOf(look.segments);
  const firstMark = barMark(slot, 0);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 11 }}>
        {firstMark && <StateMark kind={firstMark} />}
        <Box
          sx={{
            display: "flex",
            height: 11,
            width: share(slot.total, scaleEnd),
          }}
        >
          <GroupSegments slot={slot} group={first} />
        </Box>
        {slot.state.kind === "partial" && partialMark(slot.state)}
      </Box>
      {others.map((group, index) => (
        <ThinBar key={group[0].group} slot={slot} group={group} scaleEnd={scaleEnd} mark={barMark(slot, index + 1)} />
      ))}
    </Box>
  );
};

/** The row's name: its date and its first group's total, in words a screen reader reads as one. */
function energyRowName(slot: RowSlot): string {
  if (slot.state.kind === "gap" || slot.total === null) return `${slot.name}: ${GAP_TEXT.toLowerCase()}`;
  const value = slot.state.kind === "measuredZero" ? MEASURED_ZERO_KWH_TEXT : formatKilowattHours(slot.total);
  return slot.state.kind === "partial" ? `${slot.name}: ${value}, datos parciales` : `${slot.name}: ${value}`;
}

/** The savings row's name: its date and its amount. */
function savingsRowName(slot: RowSlot): string {
  if (slot.state.kind === "gap" || slot.savingsEur === null) return `${slot.name}: ${GAP_TEXT.toLowerCase()}`;
  return slot.state.kind === "partial"
    ? `${slot.name}: ${formatEuros(slot.savingsEur)}, datos parciales`
    : `${slot.name}: ${formatEuros(slot.savingsEur)}`;
}

/** What the tooltip says, beneath the open row (UI-HIS-026). */
const RowDetail = ({ id, detail: { title, lines, figures } }: { id: string; detail: SlotDetail }) => (
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
    {figures.map(({ term, technical, swatch, value }) => (
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
          <PairedTerm term={term} technical={technical} />
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

/** The energy scale above the rows: where it starts, its middle and its end, and the figures' column. */
const EnergyScale = ({ scaleEnd, header, valueWidth }: { scaleEnd: number; header: string; valueWidth: number }) => (
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
    <Typography component="span" variant="caption" sx={{ ...valueSx(valueWidth), color: colors.text.secondary }}>
      {header}
    </Typography>
  </Box>
);

export interface EnergyEvolutionRowsProps<S extends RowSlot> extends RowMarks {
  slots: readonly S[];
  /** The segments of the bars: the first group stacks in the thick bar, every other group is a thin bar beneath it. */
  look: SeriesLook<string>;
  /** Where the one scale of the list ends, every bar on it. */
  scaleEnd: number;
  /** The heading of the figure column. */
  header: string;
  /** The list's name: "Tu energía por día". */
  listLabel: string;
  /** What the open row says beneath it. */
  detail: (slot: S) => SlotDetail;
  /** The row's figure. By default its first group's total, bare, since the scale names the unit. */
  value?: (slot: S) => string;
  /** The row's name. By default its date and its first group's total. */
  name?: (slot: S) => string;
  /** The figure column's width, in px. */
  valueWidth?: number;
  /** The mark before each bar, by group in order. By default a measured zero's dot before the first. */
  barMark?: (slot: S, groupIndex: number) => StateMarkKind | null;
  rowMark?: RowMark<S>;
}

/** Below sm, the energy chart: a button per slot that opens its detail beneath it, one at a time. */
export function EnergyEvolutionRows<S extends RowSlot>({
  slots,
  look,
  scaleEnd,
  header,
  listLabel,
  detail,
  value = (slot) => (slot.total === null ? "—" : formatKilowattHourAmount(slot.total)),
  name = energyRowName,
  valueWidth = VALUE_WIDTH.energy,
  barMark = defaultBarMark,
  rowMark,
  gapText = GAP_TEXT,
  partialMark = asterisk,
}: EnergyEvolutionRowsProps<S>) {
  const [open, setOpen] = useState<string | null>(null);
  const detailId = useId();
  return (
    <Box>
      <EnergyScale scaleEnd={scaleEnd} header={header} valueWidth={valueWidth} />
      <Box component="ul" aria-label={listLabel} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {slots.map((slot) => {
          const isOpen = open === slot.key;
          const id = `${detailId}-${slot.key}`;
          const marked = rowMark?.applies(slot) ?? false;
          return (
            <Box component="li" key={slot.key}>
              <ButtonBase
                aria-label={marked ? `${name(slot)}, ${rowMark!.text}` : name(slot)}
                aria-expanded={isOpen}
                aria-controls={isOpen ? id : undefined}
                onClick={() => setOpen(isOpen ? null : slot.key)}
                sx={{
                  ...rowSx(slot),
                  width: "100%",
                  bgcolor: isOpen ? colors.brand.surface : marked ? rowMark!.tint : "transparent",
                  font: "inherit",
                }}
              >
                <RowFrame
                  slot={slot}
                  value={value(slot)}
                  valueWidth={valueWidth}
                  gapText={gapText}
                  icon={marked ? rowMark!.icon : undefined}
                >
                  <EnergyBars slot={slot} look={look} scaleEnd={scaleEnd} barMark={barMark} partialMark={partialMark} />
                </RowFrame>
              </ButtonBase>
              {isOpen && <RowDetail id={id} detail={detail(slot)} />}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export interface SavingsEvolutionRowsProps<S extends RowSlot> extends RowMarks {
  slots: readonly S[];
  /** The savings bars' colour token. */
  color: string;
  scaleEnd: number;
  /** The list's name: "Tu ahorro estimado por día". */
  listLabel: string;
  /** The row's name. By default its date and its amount. */
  name?: (slot: S) => string;
}

/** Below sm, the savings chart of a series that has savings: a row per slot, with its bar and its amount. */
export function SavingsEvolutionRows<S extends RowSlot>({
  slots,
  color,
  scaleEnd,
  listLabel,
  name = savingsRowName,
  gapText = GAP_TEXT,
  partialMark = asterisk,
}: SavingsEvolutionRowsProps<S>) {
  return (
    <Box component="ul" aria-label={listLabel} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {slots.map((slot) => (
        <Box component="li" key={slot.key} aria-label={name(slot)} sx={rowSx(slot)}>
          <RowFrame
            slot={slot}
            value={slot.savingsEur === null ? "—" : formatEuros(slot.savingsEur)}
            valueWidth={VALUE_WIDTH.savings}
            gapText={gapText}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                height: 14,
              }}
            >
              {slot.savingsZero && <StateMark kind="dot" />}
              <Box
                sx={{
                  height: 10,
                  width: share(slot.savingsEur, scaleEnd),
                  bgcolor: color,
                }}
              />
              {slot.state.kind === "partial" && partialMark(slot.state)}
            </Box>
          </RowFrame>
        </Box>
      ))}
    </Box>
  );
}
