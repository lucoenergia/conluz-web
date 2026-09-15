import { useId, type FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { alphas, colors } from "../../theme/tokens";

/**
 * An action a lifecycle surface can offer. `disabledReason` keeps the control
 * focusable and described rather than removing it from the tab order — a
 * disabled button takes its own explanation out of reach of the keyboard,
 * which is the opposite of what a gated regulatory action needs.
 */
export interface SharingAgreementActionDescriptor {
  label: string;
  onClick: () => void;
  disabledReason?: string;
}

export type SharingAgreementActionEmphasis = "primary" | "secondary" | "quiet";

/**
 * Which ground the button sits on. `onBrand` is for the next-step banner, whose
 * fill is `brand.main` — there the primary action inverts (white fill, brand
 * type) because a brand-filled button on a brand-filled banner has no edge.
 */
export type SharingAgreementActionSurface = "onLight" | "onBrand";

export interface SharingAgreementActionButtonProps {
  action: SharingAgreementActionDescriptor;
  emphasis: SharingAgreementActionEmphasis;
  surface?: SharingAgreementActionSurface;
}

/** Colour overrides for a button standing on the brand banner rather than on paper. */
function onBrandSx(emphasis: SharingAgreementActionEmphasis) {
  if (emphasis === "primary") {
    return {
      bgcolor: colors.background.paper,
      color: colors.brand.dark,
      "&:hover": { bgcolor: colors.brand.onSoft },
    };
  }
  if (emphasis === "secondary") {
    return {
      color: colors.brand.contrastText,
      borderColor: colors.brand.contrastText,
      "&:hover": { borderColor: colors.brand.contrastText, bgcolor: alphas.white.subtle },
    };
  }
  return { color: colors.brand.contrastText, "&:hover": { bgcolor: alphas.white.subtle } };
}

/**
 * A gated action stays in the tab order and carries its reason through
 * `aria-describedby`; only its appearance and its click handler are suppressed.
 *
 * Lives outside the lifecycle rail because three separate surfaces gate actions
 * this way — the rail, the next-step block and the distributor-file panel — and
 * a gating pattern that differs between them is exactly the inconsistency this
 * component exists to prevent.
 */
export const SharingAgreementActionButton: FC<SharingAgreementActionButtonProps> = ({
  action,
  emphasis,
  surface = "onLight",
}) => {
  const reasonId = useId();
  const isBlocked = !!action.disabledReason;
  const isOnBrand = surface === "onBrand";

  return (
    <Box>
      <Button
        variant={emphasis === "primary" ? "contained" : emphasis === "secondary" ? "outlined" : "text"}
        color="primary"
        disableElevation
        aria-disabled={isBlocked || undefined}
        aria-describedby={isBlocked ? reasonId : undefined}
        onClick={isBlocked ? undefined : action.onClick}
        sx={{
          whiteSpace: "nowrap",
          ...(isOnBrand && onBrandSx(emphasis)),
          ...(isBlocked && {
            // Still a control, not stray text: a surface and a stroke keep it
            // legible as a button while reading as unavailable.
            cursor: "default",
            ...(isOnBrand
              ? {
                  bgcolor: alphas.white.subtle,
                  color: colors.brand.onSoft,
                  borderColor: alphas.white.cloud,
                  "&:hover": { bgcolor: alphas.white.subtle, borderColor: alphas.white.cloud },
                }
              : {
                  bgcolor: colors.background.surface,
                  color: colors.text.muted,
                  borderColor: colors.border.light,
                  "&:hover": { bgcolor: colors.background.surface, borderColor: colors.border.light },
                }),
          }),
        }}
      >
        {action.label}
      </Button>
      {/* Reserved whether or not a reason is showing, so gaining one never moves the button. */}
      <Typography
        id={isBlocked ? reasonId : undefined}
        variant="caption"
        sx={{ display: "block", mt: 0.5, minHeight: 18, color: isOnBrand ? colors.brand.onSoft : colors.text.subtle }}
      >
        {action.disabledReason ?? ""}
      </Typography>
    </Box>
  );
};
