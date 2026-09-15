import { useId, type FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { colors } from "../../theme/tokens";

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

export interface SharingAgreementActionButtonProps {
  action: SharingAgreementActionDescriptor;
  emphasis: SharingAgreementActionEmphasis;
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
export const SharingAgreementActionButton: FC<SharingAgreementActionButtonProps> = ({ action, emphasis }) => {
  const reasonId = useId();
  const isBlocked = !!action.disabledReason;

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
          ...(isBlocked && {
            // Still a control, not stray text: a surface and a stroke keep it
            // legible as a button while reading as unavailable.
            bgcolor: colors.background.surface,
            color: colors.text.muted,
            borderColor: colors.border.light,
            cursor: "default",
            "&:hover": { bgcolor: colors.background.surface, borderColor: colors.border.light },
          }),
        }}
      >
        {action.label}
      </Button>
      {/* Reserved whether or not a reason is showing, so gaining one never moves the button. */}
      <Typography
        id={isBlocked ? reasonId : undefined}
        variant="caption"
        sx={{ display: "block", mt: 0.5, minHeight: 18, color: colors.text.subtle }}
      >
        {action.disabledReason ?? ""}
      </Typography>
    </Box>
  );
};
