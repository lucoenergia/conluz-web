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
  inputBaseClasses,
  selectClasses,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { visuallyHidden } from "@mui/utils";
import type { SupplyResponse } from "../../api/models";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { sxStyles } from "../../theme/sx";
import { colors, fontFamilies, radii } from "../../theme/tokens";

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
  /** Offer "Todos mis puntos". A page that shows one supply at a time leaves it out (#432). */
  showAll?: boolean;
}

/** The viewed supply alone: the caller owns none here (#385). */
const isViewedOnly = ({ supplies, viewed }: SupplySelectorProps) => supplies.length === 0 && !!viewed;

/**
 * Picks one of the caller's own supplies, or all of them (#247). A dropdown
 * from sm up; below it, a bottom sheet, as the contact channel editor is.
 *
 * A supply a community admin opened from its detail page sits in a group of
 * its own above the caller's (#252); choosing anything else drops it, since it
 * is offered only while the address holds it. For a caller who owns no
 * supplies, that group is all there is: no "Todos mis puntos", which would be
 * empty, and no footer about the caller's own (#385).
 */
export const SupplySelector: FC<SupplySelectorProps> = (props) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  return isWide ? <SupplyDropdown {...props} /> : <SupplySheet {...props} />;
};

const SupplyDropdown: FC<SupplySelectorProps> = (props) => {
  const { supplies, selected, viewed, onSelect, showAll = true } = props;
  const viewedOnly = isViewedOnly(props);
  return (
    <TextField
      select
      label={LABEL}
      value={selected?.id ?? ALL}
      onChange={(event) => onSelect(event.target.value === ALL ? null : event.target.value)}
      helperText={viewedOnly ? undefined : FOOTER}
      slotProps={{
        select: {
          renderValue: (value) => {
            const supply = [viewed, ...supplies].find((candidate) => candidate?.id === value);
            return supply ? <SupplyLines supply={supply} viewed={supply === viewed} /> : ALL_LABEL;
          },
        },
      }}
      // The value wraps over its two lines: never cut, never ellipsed. Both
      // classes, to outweigh the select's own nowrap.
      sx={[sxStyles.filterField, { maxWidth: 560, [`& .${selectClasses.select}.${inputBaseClasses.input}`]: { whiteSpace: "normal" } }]}
      fullWidth
    >
      {viewed && <ListSubheader>{VIEWED_GROUP}</ListSubheader>}
      {viewed && (
        <MenuItem value={viewed.id} sx={{ whiteSpace: "normal" }}>
          <SupplyLines supply={viewed} viewed />
        </MenuItem>
      )}
      {viewed && !viewedOnly && <ListSubheader>{OWN_GROUP}</ListSubheader>}
      {!viewedOnly && showAll && <MenuItem value={ALL}>{ALL_LABEL}</MenuItem>}
      {supplies.map((supply) => (
        <MenuItem key={supply.id} value={supply.id} sx={{ whiteSpace: "normal" }}>
          <SupplyLines supply={supply} />
        </MenuItem>
      ))}
    </TextField>
  );
};

const SupplySheet: FC<SupplySelectorProps> = (props) => {
  const { supplies, selected, viewed, onSelect, showAll = true } = props;
  const viewedOnly = isViewedOnly(props);
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
        aria-describedby={viewedOnly ? undefined : footerId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        endIcon={<ExpandMoreIcon aria-hidden />}
        sx={[
          sxStyles.filterField,
          { justifyContent: "space-between", textAlign: "left", textTransform: "none", borderRadius: radii.default, minWidth: 0 },
        ]}
      >
        <Box id={valueId} component="span" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
          {selected ? <SupplyLines supply={selected} viewed={selected === viewed} /> : ALL_LABEL}
        </Box>
      </Button>
      {!viewedOnly && <FormHelperText id={footerId}>{FOOTER}</FormHelperText>}
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
                label={<SupplyLines supply={viewed} viewed />}
                sx={{ alignItems: "center", minWidth: 0, mr: 0 }}
              />
              {!viewedOnly && <GroupHeading>{OWN_GROUP}</GroupHeading>}
            </>
          )}
          {!viewedOnly && showAll && <FormControlLabel value={ALL} control={<Radio />} label={ALL_LABEL} />}
          {supplies.map((supply) => (
            <FormControlLabel
              key={supply.id}
              value={supply.id}
              control={<Radio />}
              label={<SupplyLines supply={supply} />}
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

/**
 * A supply in two lines (#432): its name, as UI-SUP-010 names a supply, then
 * its CUPS and, for a supply the caller does not own, its owner. Both wrap,
 * never cut. A hidden separator keeps the accessible name one readable line:
 * "{nombre} · {CUPS} · de {titular}".
 */
const SupplyLines: FC<{ supply: SupplyResponse; viewed?: boolean }> = ({ supply, viewed = false }) => {
  const name = supplyDisplayLabel(supply);
  const owner = viewed ? supply.ownerRecord?.fullName : undefined;
  // A supply named by its CUPS alone does not repeat it on the second line.
  const showsCode = name !== supply.code;
  const hasSecondLine = showsCode || !!owner;
  return (
    <Box component="span" sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Box component="span" sx={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Typography
          component="span"
          variant="body1"
          sx={{ fontWeight: 500, color: colors.text.primary, overflowWrap: "anywhere", whiteSpace: "normal" }}
        >
          {name}
        </Typography>
        {supply.plant !== null && <Chip size="small" label="Punto de planta" />}
      </Box>
      {hasSecondLine && (
        <Typography component="span" variant="body2" sx={{ color: colors.text.secondary, overflowWrap: "anywhere", whiteSpace: "normal" }}>
          <Box component="span" sx={visuallyHidden}>
            {" · "}
          </Box>
          {showsCode && (
            <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
              {supply.code}
            </Box>
          )}
          {owner && `${showsCode ? " · " : ""}de ${owner}`}
        </Typography>
      )}
    </Box>
  );
};
