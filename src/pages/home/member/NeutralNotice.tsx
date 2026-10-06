import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { colors, radii } from "../../../theme/tokens";

/**
 * A neutral explanation: an ordinary state of the data, such as an incomplete
 * month or nothing recorded yet, never a failure. Deliberately not an Alert,
 * whose colouring would read as something having gone wrong.
 */
export const NeutralNotice: FC<{ title?: string; children: ReactNode }> = ({ title, children }) => (
  <Box
    role="note"
    sx={{
      display: "flex",
      gap: 1.5,
      p: 2,
      borderRadius: radii.default,
      bgcolor: colors.background.surface,
      border: `1px solid ${colors.border.light}`,
    }}
  >
    <InfoOutlinedIcon fontSize="small" sx={{ color: colors.text.subtle, mt: 0.25 }} aria-hidden />
    <Box>
      {title && (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
          {title}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {children}
      </Typography>
    </Box>
  </Box>
);
