import { useId, useState, type FC } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Radio,
  RadioGroup,
  SwipeableDrawer,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SupplyResponse } from "../../api/models";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { colors, radii } from "../../theme/tokens";

const ALL = "all";
const ALL_LABEL = "Todos mis puntos";
const LABEL = "Punto de suministro";
const FOOTER = "Solo aparecen tus puntos activos en esta comunidad.";

interface SupplySelectorProps {
  supplies: SupplyResponse[];
  selected: SupplyResponse | null;
  onSelect: (supplyId: string | null) => void;
}

/** "{nombre} · {CUPS}", the name falling back to the address as everywhere else (UI-SUP-010). */
function supplyOptionLabel(supply: SupplyResponse): string {
  const name = supplyDisplayLabel(supply);
  return name === supply.code ? supply.code : `${name} · ${supply.code}`;
}

/**
 * Picks one of the caller's own supplies, or all of them (#247). A dropdown
 * from sm up; below it, a bottom sheet, as the contact channel editor is.
 */
export const SupplySelector: FC<SupplySelectorProps> = (props) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  return isWide ? <SupplyDropdown {...props} /> : <SupplySheet {...props} />;
};

const SupplyDropdown: FC<SupplySelectorProps> = ({ supplies, selected, onSelect }) => (
  <TextField
    select
    label={LABEL}
    value={selected?.id ?? ALL}
    onChange={(event) => onSelect(event.target.value === ALL ? null : event.target.value)}
    helperText={FOOTER}
    sx={{ maxWidth: 560 }}
    fullWidth
  >
    <MenuItem value={ALL}>{ALL_LABEL}</MenuItem>
    {supplies.map((supply) => (
      <MenuItem key={supply.id} value={supply.id} sx={{ whiteSpace: "normal" }}>
        <OptionContent supply={supply} />
      </MenuItem>
    ))}
  </TextField>
);

const SupplySheet: FC<SupplySelectorProps> = ({ supplies, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const valueId = useId();
  const titleId = useId();
  const footerId = useId();

  const choose = (value: string) => {
    onSelect(value === ALL ? null : value);
    setOpen(false);
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
        aria-describedby={footerId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        endIcon={<ExpandMoreIcon aria-hidden />}
        sx={{ justifyContent: "space-between", textAlign: "left", textTransform: "none", borderRadius: radii.default, minWidth: 0 }}
      >
        <Box id={valueId} component="span" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
          {selected ? <OptionContent supply={selected} /> : ALL_LABEL}
        </Box>
      </Button>
      <FormHelperText id={footerId}>{FOOTER}</FormHelperText>
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
        <RadioGroup aria-labelledby={titleId} value={selected?.id ?? ALL} onChange={(event) => choose(event.target.value)}>
          <FormControlLabel value={ALL} control={<Radio />} label={ALL_LABEL} />
          {supplies.map((supply) => (
            <FormControlLabel
              key={supply.id}
              value={supply.id}
              control={<Radio />}
              label={<OptionContent supply={supply} />}
              sx={{ alignItems: "center", minWidth: 0, mr: 0 }}
            />
          ))}
        </RadioGroup>
      </SwipeableDrawer>
    </Box>
  );
};

const OptionContent: FC<{ supply: SupplyResponse }> = ({ supply }) => (
  <Box component="span" sx={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 1, minWidth: 0 }}>
    <Box component="span" sx={{ overflowWrap: "anywhere" }}>
      {supplyOptionLabel(supply)}
    </Box>
    {supply.plant !== null && <Chip size="small" label="Punto de planta" />}
  </Box>
);
