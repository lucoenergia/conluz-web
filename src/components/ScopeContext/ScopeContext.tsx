import { useId, useState, type FC, type ReactNode } from "react";
import { Avatar, Box, ButtonBase, ListSubheader, Menu, MenuItem, Typography } from "@mui/material";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { usePageScope } from "../../hooks/usePageScope";
import { useActiveCommunityDetails, type ActiveCommunityDetails } from "../../hooks/useActiveCommunityDetails";
import { communityInitials } from "../../utils/communityInitials";
import { colors, fontSizes, interactiveTransition, radii, shadows } from "../../theme/tokens";

export type ScopeContextVariant = "menuHeader" | "strip";

interface ScopeContextProps {
  /** Where the surface sits. Only the spacing and the frame differ. */
  variant: ScopeContextVariant;
}

/** The accessible name of the surface, whichever variant renders it. */
const SCOPE_CONTEXT_LABEL = "Ámbito de la página";

const AVATAR_SIZE = 36;
const LIST_AVATAR_SIZE = 28;
const MENU_MAX_WIDTH = 320;

const avatarSx = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  fontSize: fontSizes.md,
  fontWeight: 700,
  borderRadius: radii.default,
} as const;

// The community avatar is the only brand-tinted one. It is decoration, not
// the signal: the three states differ by icon and wording, so they stay
// distinguishable with colour removed.
const communityAvatarSx = { ...avatarSx, bgcolor: colors.brand.surface, color: colors.brand.main };
const neutralAvatarSx = {
  ...avatarSx,
  bgcolor: colors.background.surface,
  color: colors.text.subtle,
  border: `1px solid ${colors.border.light}`,
};

interface ScopeRowProps {
  avatar: ReactNode;
  label: string;
  title: string;
  trailing?: ReactNode;
}

/** Avatar, a small label and a title that truncates with an ellipsis. */
const ScopeRow: FC<ScopeRowProps> = ({ avatar, label, title, trailing }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, width: "100%" }}>
    {avatar}
    <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
      <Typography
        component="span"
        sx={{
          display: "block",
          fontSize: fontSizes.xs,
          fontWeight: 600,
          color: colors.text.muted,
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
      <Typography
        component="span"
        noWrap
        sx={{ display: "block", fontSize: fontSizes.lg, fontWeight: 600, color: colors.text.primary, lineHeight: 1.4 }}
      >
        {title}
      </Typography>
    </Box>
    {trailing}
  </Box>
);

const Description: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography sx={{ mt: 0.75, fontSize: fontSizes.xs, color: colors.text.subtle, lineHeight: 1.5 }}>
    {children}
  </Typography>
);

// Both variants sit right under a <Toolbar /> spacer, but the app bar's own
// toolbar adds `py: 1` (Header.tsx), so it is 2 spacing units taller than
// the spacer. The extra top padding keeps the label clear of the bar.
const APP_BAR_OVERHANG = 2;

const frameSx = (variant: ScopeContextVariant) =>
  variant === "menuHeader"
    ? { px: 2.5, pt: 2 + APP_BAR_OVERHANG, pb: 1.5, borderBottom: `1px solid ${colors.divider}` }
    : {
        px: { xs: 2, sm: 3 },
        pt: 1 + APP_BAR_OVERHANG,
        pb: 1,
        bgcolor: "background.paper",
        borderBottom: `1px solid ${colors.divider}`,
      };

interface CommunitySwitchProps {
  details: ActiveCommunityDetails;
  /**
   * Overrides the button's accessible name. A screen that shows this control
   * beside the scope surface's own gives it a different name, so the two are
   * told apart.
   */
  buttonLabel?: string;
}

/**
 * The active community and, for a caller with several, the control that
 * switches it. Exported so a page can offer the same control rather than a
 * second one.
 */
export const CommunitySwitch: FC<CommunitySwitchProps> = ({ details, buttonLabel }) => {
  const { activeCommunityId, activeCommunity, communities, membershipCount, select } = details;
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const menuId = useId();

  const hasActive = activeCommunityId !== null;
  const name = activeCommunity?.name ?? (hasActive ? "Cargando comunidad…" : "Selecciona una comunidad");
  const avatar = hasActive ? (
    <Avatar aria-hidden sx={communityAvatarSx}>
      {communityInitials(activeCommunity?.name)}
    </Avatar>
  ) : (
    <Avatar aria-hidden sx={neutralAvatarSx}>
      <BusinessRoundedIcon fontSize="small" />
    </Avatar>
  );
  const label = "Comunidad activa";
  const description = hasActive
    ? "Los datos y los cambios de esta página pertenecen a esta comunidad."
    : "Elige la comunidad con la que quieres trabajar.";

  if (membershipCount === 1) {
    return (
      <>
        <ScopeRow avatar={avatar} label={label} title={name} />
        <Description>{description}</Description>
      </>
    );
  }

  const handleSelect = (communityId: string) => {
    select(communityId);
    setAnchorElement(null);
  };

  return (
    <>
      <ButtonBase
        aria-haspopup="menu"
        aria-expanded={anchorElement ? "true" : "false"}
        aria-controls={anchorElement ? menuId : undefined}
        aria-label={buttonLabel ?? (hasActive ? `${label}: ${name}. Cambiar comunidad` : `${name}. Cambiar comunidad`)}
        onClick={(event) => setAnchorElement(event.currentTarget)}
        sx={{
          width: "100%",
          p: 0.75,
          m: -0.75,
          borderRadius: radii.default,
          transition: interactiveTransition("0.2s"),
          "&:hover": { bgcolor: colors.background.surface },
          "&.Mui-focusVisible": { outline: `2px solid ${colors.brand.main}`, outlineOffset: 2 },
        }}
      >
        <ScopeRow
          avatar={avatar}
          label={label}
          title={name}
          trailing={<UnfoldMoreRoundedIcon aria-hidden sx={{ color: colors.text.subtle }} />}
        />
      </ButtonBase>
      <Description>{description}</Description>
      <Menu
        id={menuId}
        anchorEl={anchorElement}
        open={Boolean(anchorElement)}
        onClose={() => setAnchorElement(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 260,
              maxWidth: MENU_MAX_WIDTH,
              borderRadius: radii.default,
              boxShadow: shadows.dropdown,
              border: `1px solid ${colors.divider}`,
            },
          },
        }}
      >
        <ListSubheader
          sx={{ lineHeight: 2.5, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted }}
        >
          Tus comunidades
        </ListSubheader>
        {communities.map((community) => {
          const isActive = community.id === activeCommunityId;
          return (
            <MenuItem
              key={community.id}
              selected={isActive}
              aria-current={isActive ? "true" : undefined}
              onClick={() => handleSelect(community.id!)}
              sx={{ gap: 1.5, alignItems: "flex-start", py: 1, whiteSpace: "normal" }}
            >
              <Avatar
                aria-hidden
                sx={{ ...communityAvatarSx, width: LIST_AVATAR_SIZE, height: LIST_AVATAR_SIZE, fontSize: fontSizes.xs }}
              >
                {communityInitials(community.name)}
              </Avatar>
              {/* The full name wraps rather than truncating: this list is where a
                  name clipped on the closed control is read in full. */}
              <Typography
                component="span"
                sx={{ flex: 1, fontSize: fontSizes.md, color: colors.text.body, overflowWrap: "anywhere", pt: 0.5 }}
              >
                {community.name}
              </Typography>
              {isActive && <CheckRoundedIcon aria-hidden fontSize="small" sx={{ color: colors.brand.main, mt: 0.5 }} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

const FixedScope: FC<{ icon: ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <>
    <ScopeRow avatar={<Avatar aria-hidden sx={neutralAvatarSx}>{icon}</Avatar>} label="Ámbito" title={title} />
    <Description>{description}</Description>
  </>
);

/**
 * States what the current page reads and writes: the active community, the
 * whole platform, or the user's own account (#186).
 *
 * It renders in one of two places, the side-menu header or the strip under
 * the app bar, and the layout mounts exactly one of them at a time. Pages with
 * nothing to state (`none`) or an unclassified route (`unknown`) render
 * nothing rather than a guess.
 */
export const ScopeContext: FC<ScopeContextProps> = ({ variant }) => {
  const scope = usePageScope();
  const communityDetails = useActiveCommunityDetails();

  let content: ReactNode;
  if (scope === "community") {
    // No membership, no community to state. The landing at "/" moves such a
    // user off community pages; render nothing meanwhile.
    if (communityDetails.membershipCount === 0) return null;
    content = <CommunitySwitch details={communityDetails} />;
  } else if (scope === "platform") {
    content = (
      <FixedScope
        icon={<PublicRoundedIcon fontSize="small" />}
        title="Toda la plataforma"
        description="Esta página no depende de la comunidad activa."
      />
    );
  } else if (scope === "personal") {
    content = (
      <FixedScope
        icon={<PersonRoundedIcon fontSize="small" />}
        title="Tu cuenta"
        description="Esta página solo afecta a tus propios datos."
      />
    );
  } else {
    return null;
  }

  return (
    <Box component="section" aria-label={SCOPE_CONTEXT_LABEL} sx={frameSx(variant)}>
      {content}
    </Box>
  );
};
