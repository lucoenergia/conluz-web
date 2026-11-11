import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { colors } from "../../theme/tokens";

export type StateMarkKind = "ring" | "dot" | "asterisk";

/**
 * A slot's state mark, as the charts and the key draw it (UI-HIS-015): a ring
 * for a gap, a dot for a measured zero, an asterisk for a partial slot. It is
 * hidden from assistive technology: the words beside it, or the row's name,
 * say the same.
 */
export const StateMark: FC<{ kind: StateMarkKind }> = ({ kind }) => {
  if (kind === "asterisk") {
    return (
      <Typography
        aria-hidden
        component="span"
        sx={{
          flexShrink: 0,
          fontWeight: 700,
          color: colors.text.primary,
          lineHeight: 1,
          width: 10,
          textAlign: "center",
        }}
      >
        *
      </Typography>
    );
  }
  return (
    <Box
      aria-hidden
      sx={{
        flexShrink: 0,
        width: 10,
        height: 10,
        borderRadius: "50%",
        boxSizing: "border-box",
        ...(kind === "ring"
          ? {
              border: `2px solid ${colors.text.muted}`,
              bgcolor: colors.background.paper,
            }
          : { bgcolor: colors.text.primary }),
      }}
    />
  );
};
