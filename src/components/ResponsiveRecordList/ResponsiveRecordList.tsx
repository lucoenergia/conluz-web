import type { FC, ReactNode, Ref } from "react";
import { Box, Paper } from "@mui/material";
import { colors, radii, shadows } from "../../theme/tokens";
import { LoadErrorAlert } from "../LoadErrorAlert";
import { useListLayout } from "./useListLayout";

export interface ResponsiveRecordListProps {
  /** The stacked layout, a `RecordList`, shown below `LIST_TABLE_MIN_WIDTH`. */
  narrow: ReactNode;
  /** The table layout, a `ListTable`, shown from `LIST_TABLE_MIN_WIDTH`. */
  wide: ReactNode;
  /** A failed read: what failed, and the retry that sends it again. Shown alone. */
  error?: { message: string; onRetry: () => void };
  /** An `EmptyState`, shown instead of either layout. Pass it only when there are no rows. */
  empty?: ReactNode;
  /** Inside the panel, above the rows: filters, counts, a live region. */
  header?: ReactNode;
  /** Inside the panel, below a hairline: the pagination. A footer that renders nothing draws no hairline. */
  footer?: ReactNode;
  /** The panel, e.g. to scroll it into view on a page change. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * The panel of a records list, holding exactly one of its two layouts (#347).
 *
 * It knows nothing about the rows: each layout draws its own loading state,
 * and the page decides when the list is empty. A failed read replaces
 * everything in the panel, so it is never mistaken for an empty list
 * (UI-LST-004).
 */
export const ResponsiveRecordList: FC<ResponsiveRecordListProps> = ({
  narrow,
  wide,
  error,
  empty,
  header,
  footer,
  ref,
}) => {
  const layout = useListLayout();

  return (
    <Paper
      ref={ref}
      elevation={0}
      sx={{
        bgcolor: colors.background.paper,
        boxShadow: shadows.soft,
        borderRadius: { xs: radii.default, sm: radii.large },
        overflow: "hidden",
        width: "100%",
      }}
    >
      {error ? (
        <Box sx={{ p: 2 }}>
          <LoadErrorAlert message={error.message} onRetry={error.onRetry} />
        </Box>
      ) : (
        <>
          {header}
          {empty ? <Box sx={{ p: 2 }}>{empty}</Box> : layout === "wide" ? wide : narrow}
          {footer && (
            <Box
              sx={{
                borderTop: `1px solid ${colors.divider}`,
                p: 2,
                // A footer whose content renders nothing (a single page) leaves no hairline.
                "&:empty": { display: "none" },
              }}
            >
              {footer}
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};
