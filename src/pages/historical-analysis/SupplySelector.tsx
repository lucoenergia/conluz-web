import { useId, useState, type FC } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  FormHelperText,
  ListSubheader,
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
const VIEWED_GROUP = "Punto que estás consultando";
const OWN_GROUP = "Tus puntos";

interface SupplySelectorProps {
  supplies: SupplyResponse[];
  selected: SupplyResponse | null;
  /** A supply of the community the caller does not own, opened by a community admin (#252). */
  viewed?: SupplyResponse | null;
  onSelect: (supplyId: string | null) => void;
}

/** "{nombre} · {CUPS}", the name falling back to the address as everywhere else (UI-SUP-010). */
function supplyOptionLabel(supply: SupplyResponse): string {
  const name = supplyDisplayLabel(supply);
  return name === supply.code ? supply.code : `${name} · ${supply.code}`;
}

/** The viewed supply also names its owner's member record, when the response carries one. */
function viewedOptionLabel(supply: SupplyResponse): string {
  const label = supplyOptionLabel(supply);
  return supply.ownerRecord ? `${label} · ${supply.ownerRecord.fullName}` : label;
}

/**
 * Picks one of the caller's own supplies, or all of them (#247). A dropdown
 * from sm up; below it, a bottom sheet, as the contact channel editor is.
 *
 * A supply a community admin opened from its detail page sits in a group of
 * its own above the caller's (#252); choosing anything else drops it, since it
 * is offered only while the address holds it.
 */
export const SupplySelector: FC<SupplySelectorProps> = (props) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  return isWide ? <SupplyDropdown {...props} /> : <SupplySheet {...props} />;
};

const SupplyDropdown: FC<SupplySelectorProps> = ({ supplies, selected, viewed, onSelect }) => (
  <TextField
    select
    label={LABEL}
    value={selected?.id ?? ALL}
    onChange={(event) => onSelect(event.target.value === ALL ? null : event.target.value)}
    helperText={FOOTER}
    sx={{ maxWidth: 560 }}
    fullWidth
  >
    {viewed && <ListSubheader>{VIEWED_GROUP}</ListSubheader>}
    {viewed && (
      <MenuItem value={viewed.id} sx={{ whiteSpace: "normal" }}>
        <OptionContent supply={viewed} label={viewedOptionLabel(viewed)} />
      </MenuItem>
    )}
    {viewed && <ListSubheader>{OWN_GROUP}</ListSubheader>}
    <MenuItem value={ALL}>{ALL_LABEL}</MenuItem>
    {supplies.map((supply) => (
      <MenuItem key={supply.id} value={supply.id} sx={{ whiteSpace: "normal" }}>
        <OptionContent supply={supply} />
      </MenuItem>
    ))}
  </TextField>
);

const SupplySheet: FC<SupplySelectorProps> = ({ supplies, selected, viewed, onSelect }) => {
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
          {selected ? (
            <OptionContent supply={selected} label={selected === viewed ? viewedOptionLabel(selected) : undefined} />
          ) : (
            ALL_LABEL
          )}
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
          {viewed && (
            <>
              <GroupHeading>{VIEWED_GROUP}</GroupHeading>
              <FormControlLabel
                value={viewed.id}
                control={<Radio />}
                label={<OptionContent supply={viewed} label={viewedOptionLabel(viewed)} />}
                sx={{ alignItems: "center", minWidth: 0, mr: 0 }}
              />
              <GroupHeading>{OWN_GROUP}</GroupHeading>
            </>
          )}
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

const GroupHeading: FC<{ children: string }> = ({ children }) => (
  <Typography variant="overline" component="h3" sx={{ color: colors.text.secondary, mt: 1 }}>
    {children}
  </Typography>
);

const OptionContent: FC<{ supply: SupplyResponse; label?: string }> = ({ supply, label }) => (
  <Box component="span" sx={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 1, minWidth: 0 }}>
    <Box component="span" sx={{ overflowWrap: "anywhere" }}>
      {label ?? supplyOptionLabel(supply)}
    </Box>
    {supply.plant !== null && <Chip size="small" label="Punto de planta" />}
  </Box>
);
