import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { SharingAgreementActionButton } from "../SharingAgreementActionButton";
import { SharingAgreementLifecycleSpine } from "../SharingAgreementLifecycleSpine";
import type { LifecycleActionKind, LifecycleView } from "../../pages/production/sharingAgreementLifecycle";

/**
 * One handler per action the lifecycle can name. The selector decides *which*
 * action belongs to the current step and what it is called; this map only says
 * what each one does. An intent with no handler is simply not rendered.
 */
export type LifecycleActionHandlers = Partial<Record<LifecycleActionKind, () => void>>;

export interface SharingAgreementNextStepBannerProps {
  view: LifecycleView;
  handlers: LifecycleActionHandlers;
  /**
   * The reverse move off stage 4. Not a step of the cycle and never the primary
   * action, so it is passed separately rather than coming out of the selector.
   */
  revert?: { label: string; onClick: () => void };
  /** A closed cycle is tinted slate rather than brand, so it never reads as live. */
  isClosed?: boolean;
}

/**
 * The block the page is built around: one sentence saying what to do now, the
 * control that does it, and — when the state-advancing action is withheld — the
 * reason, as visible text.
 *
 * Nothing here decides anything. Every rule about which action is available in
 * which state lives in `selectSharingAgreementLifecycleView`, which is why the
 * publish rule that used to be re-implemented in this header is gone.
 */
export const SharingAgreementNextStepBanner: FC<SharingAgreementNextStepBannerProps> = ({
  view,
  handlers,
  revert,
  isClosed = false,
}) => {
  const { headline, primary, secondary, blockedNote } = view;

  const primaryHandler = primary && handlers[primary.kind];
  const secondaryHandler = secondary && handlers[secondary.kind];
  const hasActions = !!(primary && primaryHandler) || !!(secondary && secondaryHandler) || !!revert;

  return (
    <Box
      sx={{
        bgcolor: isClosed ? colors.secondary.main : colors.brand.main,
        borderRadius: { xs: 0, sm: radii.large },
        p: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box>
        <Typography
          component="p"
          sx={{
            fontSize: fontSizes.xs,
            fontWeight: 500,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: colors.brand.onSoft,
          }}
        >
          Siguiente paso
        </Typography>
        {headline && (
          <Typography
            component="p"
            sx={{
              mt: 1,
              fontSize: { xs: fontSizes["2xl"], sm: "1.25rem" },
              fontWeight: 600,
              lineHeight: 1.35,
              color: colors.brand.contrastText,
              textWrap: "pretty",
            }}
          >
            {headline}
          </Typography>
        )}
      </Box>

      {hasActions && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "flex-start" },
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          {primary && primaryHandler && (
            <SharingAgreementActionButton
              action={{ label: primary.label, onClick: primaryHandler }}
              emphasis="primary"
              surface="onBrand"
            />
          )}
          {secondary && secondaryHandler && (
            <SharingAgreementActionButton
              action={{ label: secondary.label, onClick: secondaryHandler }}
              emphasis="secondary"
              surface="onBrand"
            />
          )}
          {revert && (
            <SharingAgreementActionButton action={revert} emphasis="quiet" surface="onBrand" />
          )}
        </Box>
      )}

      {/* Why the forward action is missing. Visible text, never a tooltip: the
          action it explains is not on screen to hang a description off. */}
      {blockedNote && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <LockOutlinedIcon sx={{ fontSize: 20, flexShrink: 0, color: colors.brand.onSoft }} />
          <Typography
            sx={{ fontSize: fontSizes.lg, lineHeight: 1.5, color: colors.brand.onSoft, textWrap: "pretty" }}
          >
            {blockedNote}
          </Typography>
        </Box>
      )}

      <SharingAgreementLifecycleSpine view={view} />
    </Box>
  );
};
