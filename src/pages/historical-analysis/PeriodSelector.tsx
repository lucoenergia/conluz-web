import { useId, useRef, useState, type FC } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  SwipeableDrawer,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { colors, radii } from "../../theme/tokens";
import { CustomRangePicker } from "./CustomRangePicker";
import { presetSummary, resolvePeriod, type CalendarMonth, type PeriodSelection, type PresetKind } from "./historicalPeriod";

const LABEL = "Periodo";

const NAMES: Record<PeriodSelection["kind"], string> = {
  latest: "Último mes publicado",
  year: "Este año",
  last12: "Últimos 12 meses",
  custom: "Rango personalizado",
};
const CUSTOM_SUMMARY = "Elige las fechas, hasta 24 meses";
const PRESETS: PresetKind[] = ["latest", "year", "last12"];

interface PeriodSelectorProps {
  anchor: CalendarMonth;
  selection: PeriodSelection;
  onSelect: (selection: PeriodSelection) => void;
}

interface Option {
  kind: PeriodSelection["kind"];
  name: string;
  /** The period it resolves to and its granularity, so the caller sees it before choosing (UI-HIS-006). */
  summary: string;
}

const optionsFor = (anchor: CalendarMonth): Option[] => [
  ...PRESETS.map((kind) => ({ kind, name: NAMES[kind], summary: presetSummary(resolvePeriod(anchor, { kind })) })),
  { kind: "custom", name: NAMES.custom, summary: CUSTOM_SUMMARY },
];

/**
 * Picks the period (#248): the three presets, each showing the period it
 * resolves to from the anchor, or a custom range. A dropdown from sm up, as
 * the supply selector is; below it, a bottom sheet.
 */
export const PeriodSelector: FC<PeriodSelectorProps> = (props) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  return isWide ? <PeriodDropdown {...props} /> : <PeriodSheet {...props} />;
};

const PeriodDropdown: FC<PeriodSelectorProps> = ({ anchor, selection, onSelect }) => {
  const [rangeOpen, setRangeOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <TextField
        ref={fieldRef}
        select
        label={LABEL}
        value={selection.kind}
        onChange={(event) => {
          const kind = event.target.value as PeriodSelection["kind"];
          if (kind !== "custom") onSelect({ kind });
        }}
        slotProps={{ select: { renderValue: (kind) => NAMES[kind as PeriodSelection["kind"]] } }}
        fullWidth
      >
        {optionsFor(anchor).map((option) => (
          <MenuItem
            key={option.kind}
            value={option.kind}
            // Opens the picker whether or not a custom range is already in force.
            onClick={option.kind === "custom" ? () => setRangeOpen(true) : undefined}
            sx={{ whiteSpace: "normal", gap: 1 }}
          >
            <ListItemText primary={option.name} secondary={option.summary} />
            {option.kind === "custom" && <ChevronRightIcon fontSize="small" sx={{ color: colors.text.subtle }} aria-hidden />}
          </MenuItem>
        ))}
      </TextField>
      <CustomRangePicker
        open={rangeOpen}
        anchor={anchor}
        current={selection}
        variant="popover"
        anchorEl={fieldRef.current}
        onClose={() => setRangeOpen(false)}
        onApply={(range) => {
          setRangeOpen(false);
          onSelect(range);
        }}
      />
    </>
  );
};

const PeriodSheet: FC<PeriodSelectorProps> = ({ anchor, selection, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const labelId = useId();
  const valueId = useId();
  const titleId = useId();

  const openRange = () => {
    setOpen(false);
    setRangeOpen(true);
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography id={labelId} variant="body2" sx={{ color: colors.text.body, mb: 0.5 }}>
        {LABEL}
      </Typography>
      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="dialog"
        aria-expanded={open || rangeOpen}
        onClick={() => setOpen(true)}
        endIcon={<ExpandMoreIcon aria-hidden />}
        sx={{ justifyContent: "space-between", textAlign: "left", textTransform: "none", borderRadius: radii.default, minWidth: 0 }}
      >
        <Box id={valueId} component="span" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
          {NAMES[selection.kind]}
        </Box>
      </Button>
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        onOpen={() => {}}
        disableSwipeToOpen
        // A drawer sits under the app bar; this one is a modal sheet, so it goes on top.
        sx={{ zIndex: (t) => t.zIndex.modal }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": titleId,
            sx: { maxHeight: "calc(100% - 24px)", borderRadius: `${radii.large} ${radii.large} 0 0`, p: 2 },
          },
        }}
      >
        <Typography id={titleId} variant="h6" component="h2" sx={{ mb: 1 }}>
          {LABEL}
        </Typography>
        <RadioGroup
          aria-labelledby={titleId}
          value={selection.kind}
          onChange={(event) => {
            const kind = event.target.value as PeriodSelection["kind"];
            if (kind === "custom") return;
            onSelect({ kind });
            setOpen(false);
          }}
        >
          {optionsFor(anchor).map((option) => (
            <FormControlLabel
              key={option.kind}
              value={option.kind}
              control={<Radio />}
              // Opens the picker whether or not a custom range is already in force.
              onClick={option.kind === "custom" ? openRange : undefined}
              label={
                <Box component="span" sx={{ display: "flex", flexDirection: "column", py: 0.5 }}>
                  <span>{option.name}</span>
                  <Typography component="span" variant="body2" sx={{ color: colors.text.subtle }}>
                    {option.summary}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "center", minWidth: 0, mr: 0 }}
            />
          ))}
        </RadioGroup>
      </SwipeableDrawer>
      <CustomRangePicker
        open={rangeOpen}
        anchor={anchor}
        current={selection}
        variant="sheet"
        anchorEl={null}
        onClose={() => setRangeOpen(false)}
        onApply={(range) => {
          setRangeOpen(false);
          onSelect(range);
        }}
      />
    </Box>
  );
};
