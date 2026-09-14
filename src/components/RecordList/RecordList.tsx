import type { FC, ReactNode } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { colors, fontSizes, radii } from "../../theme/tokens";

export interface RecordField {
  label: string;
  value: ReactNode;
}

export interface RecordListItem {
  id: string;
  /** Leading avatar or icon. Optional — omit for records without one. */
  avatar?: ReactNode;
  title: string;
  /** Secondary marker under the title, e.g. a role chip. */
  badge?: ReactNode;
  /** Status chip, kept on the title line so state reads at a glance. */
  status?: ReactNode;
  /** Row actions. Always rendered on the title line so they can never be
   *  pushed out of reach the way an off-canvas table column can. */
  actions?: ReactNode;
  fields: RecordField[];
}

export interface RecordListProps {
  items: RecordListItem[];
  /** Accessible name for the list. */
  label: string;
  isLoading?: boolean;
  emptyMessage: string;
}

/**
 * The narrow-viewport counterpart to a data table.
 *
 * A `<TableContainer>` scrolls horizontally, so on a phone the last column —
 * which is where row actions live — sits off-canvas with no affordance
 * suggesting it exists. Reflowing each record into a stacked block keeps every
 * field and, critically, the actions reachable without horizontal scrolling.
 *
 * Pair with a table hidden below the `sm` breakpoint; this list hides above it.
 */
export const RecordList: FC<RecordListProps> = ({ items, label, isLoading, emptyMessage }) => {
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="ul"
      aria-label={label}
      sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      {items.map((item) => (
        <Box
          component="li"
          key={item.id}
          sx={{
            border: `1px solid ${colors.divider}`,
            borderRadius: radii.default,
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            backgroundColor: colors.background.paper,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            {item.avatar}
            {/* minWidth:0 lets a long name shrink instead of forcing the row wide */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "text.primary", overflowWrap: "anywhere" }}
              >
                {item.title}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
              {item.status}
              {item.actions}
            </Box>
          </Box>

          {/* Full width, not inside the title column: sharing that column with
              the status chip and actions squeezed a chip label to an ellipsis. */}
          {item.badge && <Box sx={{ display: "flex", flexWrap: "wrap" }}>{item.badge}</Box>}

          {item.fields.length > 0 && (
            <Box
              component="dl"
              sx={{
                m: 0,
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                columnGap: 1.5,
                rowGap: 0.5,
                alignItems: "baseline",
              }}
            >
              {item.fields.map((field) => (
                <Box key={field.label} sx={{ display: "contents" }}>
                  <Typography
                    component="dt"
                    sx={{ fontSize: fontSizes.xs, color: colors.text.subtle, whiteSpace: "nowrap" }}
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    component="dd"
                    sx={{
                      m: 0,
                      fontSize: fontSizes.md,
                      color: "secondary.main",
                      overflowWrap: "anywhere",
                      minWidth: 0,
                    }}
                  >
                    {field.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};
