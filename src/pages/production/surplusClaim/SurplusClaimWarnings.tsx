import type { FC, Ref } from "react";
import { Box, Typography } from "@mui/material";
import { Notice } from "../../../components/Notice";
import { sectionScrollMarginSx } from "../../../components/PlantSection/sectionAnchors";
import { colors } from "../../../theme/tokens";
import type { RaisedWarning } from "./surplusClaimFormat";

export interface SurplusClaimWarningsProps {
  warnings: readonly RaisedWarning[];
  /** "octubre de 2026": names the area for assistive technology. */
  monthPhrase: string;
  /** Where "Ver avisos" moves focus. */
  ref?: Ref<HTMLElement>;
}

/**
 * The warnings the month raises, each a warning notice with its sentence and
 * what it lists, unnumbered and in a fixed order (UI-SCL-005). The area has no
 * heading of its own: "Ver avisos" brings it into view and moves focus to it.
 */
export const SurplusClaimWarnings: FC<SurplusClaimWarningsProps> = ({ warnings, monthPhrase, ref }) => (
  <Box
    component="section"
    id="avisos-del-mes"
    ref={ref}
    tabIndex={-1}
    aria-label={`Avisos de ${monthPhrase}`}
    sx={[{ display: "flex", flexDirection: "column", gap: 1, outline: "none" }, sectionScrollMarginSx]}
  >
    {warnings.map((warning) => (
      <Notice key={warning.key} severity="warning">
        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
          {warning.title}
        </Typography>
        {warning.entries.length > 0 && (
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, color: colors.text.body }}>
            {warning.entries.map((parts) => (
              <Typography component="li" variant="body2" key={parts.join(" · ")}>
                {parts.join(" · ")}
              </Typography>
            ))}
          </Box>
        )}
      </Notice>
    ))}
  </Box>
);
