import type { FC } from "react";
import { Box } from "@mui/material";
import { colors } from "../../theme/tokens";

/**
 * A home term with the technical term it carries, if any, muted after it
 * (UI-HIS-027): "De la comunidad · autoconsumo". `stacked` puts the technical
 * term on a line of its own, as a column header does, followed by `unit`.
 */
export const PairedTerm: FC<{ term: string; technical?: string; unit?: string; stacked?: boolean }> = ({
  term,
  technical,
  unit,
  stacked = false,
}) => {
  const unitText = unit ? ` (${unit})` : "";
  if (!technical) return <>{`${term}${unitText}`}</>;
  if (stacked) {
    return (
      <>
        {term}{" "}
        <Box component="span" sx={{ display: "block" }}>
          <Box component="span" sx={{ color: colors.text.secondary, fontWeight: 400 }}>
            {technical}
          </Box>
          {unitText}
        </Box>
      </>
    );
  }
  return (
    <>
      {term}{" "}
      <Box component="span" sx={{ color: colors.text.secondary, fontWeight: 400 }}>
        · {technical}
      </Box>
      {unitText}
    </>
  );
};
