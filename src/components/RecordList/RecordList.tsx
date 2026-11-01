import type { FC, ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { Box, IconButton, Link, Skeleton, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import type { RowActions } from "../ListTable/RowActions";

export interface RecordField {
  label: string;
  value: ReactNode;
}

export interface RecordListItem {
  id: string;
  /** Leading selection checkbox, named "Seleccionar <name>", for a page that
   *  acts on several records at once. When any item has one, every item gets
   *  the slot, so the rows stay aligned whether or not theirs can be
   *  selected. The actions on the selection live outside the list. */
  selection?: ReactNode;
  /** Leading avatar or icon. Optional — omit for records without one. */
  avatar?: ReactNode;
  title: string;
  /** The record's detail route. The title becomes its link; the row never does (UI-LST-002). */
  href?: string;
  /** Secondary marker under the title, e.g. a role chip. */
  badge?: ReactNode;
  /** Status chip, kept on the title line so state reads at a glance. */
  status?: ReactNode;
  /** Plain lines under the badge, one per row. A long value wraps rather than
   *  being cut, so nothing is hidden. */
  lines?: ReactNode[];
  fields?: RecordField[];
  /** Mutes the row, e.g. for a disabled record. */
  inactive?: boolean;
}

/** Footprint of a Checkbox (24px icon + 9px padding either side), so a row
 *  without one keeps its avatar where the others have theirs. */
const SELECTION_SLOT_WIDTH = 42;

export interface RecordListProps {
  items: RecordListItem[];
  /** Accessible name for the list. */
  label: string;
  /** Shows skeleton rows in place of the records. */
  isLoading?: boolean;
  /** How many skeleton rows a load shows. */
  loadingRows?: number;
  /** Each record's kebab, always on the title line so it can never be pushed
   *  out of reach the way an off-canvas table column can. */
  rowActions?: RowActions<RecordListItem>;
  /** A trailing chevron inside the title link, on rows with `href` and no actions. */
  chevron?: boolean;
}

/** One record per row, all in the list's panel, separated by a hairline. */
const rowSx = {
  px: 2,
  py: 1.5,
  display: "flex",
  flexDirection: "column",
  gap: 1,
  "&:not(:first-of-type)": { borderTop: `1px solid ${colors.divider}` },
} as const;

const titleTextSx = {
  fontSize: fontSizes.lg,
  fontWeight: 600,
  overflowWrap: "anywhere",
} as const;

/**
 * The narrow-viewport counterpart to a data table (UI-LST-001).
 *
 * Each record reflows into a stacked row, so every field and the actions stay
 * reachable without scrolling sideways. Only the title may link to the
 * record's detail; the row itself is never a link or a click target, so its
 * identifiers can be selected as text (UI-LST-002).
 */
export const RecordList: FC<RecordListProps> = ({
  items,
  label,
  isLoading,
  loadingRows = 5,
  rowActions,
  chevron,
}) => {
  if (isLoading) {
    return (
      <Box component="ul" aria-label={label} aria-busy="true" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {Array.from({ length: loadingRows }, (_, index) => (
          <Box component="li" key={index} aria-hidden sx={rowSx}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="text" sx={{ flex: 1, fontSize: fontSizes.lg }} />
            </Box>
            <Skeleton variant="text" width="60%" />
          </Box>
        ))}
      </Box>
    );
  }

  const hasSelectionSlot = items.some((item) => item.selection !== undefined);

  return (
    <Box component="ul" aria-label={label} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {items.map((item) => {
        const hasActions = !!rowActions && (rowActions.has?.(item) ?? true);
        const textColor = item.inactive ? colors.text.muted : colors.text.primary;
        return (
          <Box component="li" key={item.id} sx={rowSx}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {hasSelectionSlot && (
                <Box sx={{ width: SELECTION_SLOT_WIDTH, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                  {item.selection}
                </Box>
              )}
              {item.avatar}
              {/* minWidth:0 lets a long name shrink instead of forcing the row wide */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {item.href ? (
                  <Link
                    component={RouterLink}
                    to={item.href}
                    underline="none"
                    sx={{
                      ...titleTextSx,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      width: "100%",
                      minHeight: 44,
                      color: textColor,
                      "&:hover": { color: colors.brand.main },
                      "&:focus-visible": {
                        outline: "2px solid",
                        outlineColor: colors.brand.main,
                        outlineOffset: "2px",
                      },
                    }}
                  >
                    <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                      {item.title}
                    </Box>
                    {chevron && !hasActions && <ChevronRightRoundedIcon aria-hidden sx={{ flexShrink: 0 }} />}
                  </Link>
                ) : (
                  <Typography sx={{ ...titleTextSx, color: textColor }}>{item.title}</Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                {item.status}
                {hasActions && (
                  <IconButton
                    aria-label={rowActions.label(item)}
                    onClick={(event) => rowActions.onClick(event, item)}
                    sx={sxStyles.touchTarget}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Full width, not inside the title column: sharing that column with
                the status chip and actions squeezed a chip label to an ellipsis. */}
            {item.badge && <Box sx={{ display: "flex", flexWrap: "wrap" }}>{item.badge}</Box>}

            {item.lines?.map((line, index) => (
              <Typography
                key={index}
                variant="body2"
                sx={{ fontSize: fontSizes.sm, color: "text.secondary", minWidth: 0, overflowWrap: "anywhere" }}
              >
                {line}
              </Typography>
            ))}

            {item.fields && item.fields.length > 0 && (
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
                        color: item.inactive ? colors.text.muted : "secondary.main",
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
        );
      })}
    </Box>
  );
};
