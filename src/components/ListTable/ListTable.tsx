import type { Key, ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import {
  Box,
  IconButton,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { colors } from "../../theme/tokens";
import type { RowActions } from "./RowActions";

export interface ListTableColumn<T> {
  key: string;
  /** A string renders as the standard header text; a node renders as is (sort label, icon header). */
  header: ReactNode;
  align?: "left" | "center";
  render: (row: T) => ReactNode;
  /**
   * The column's width under the table's fixed layout: a CSS length or a
   * percentage of the table ("112px", "20%"), never grid syntax (`fr`,
   * `minmax`). Columns without one share the space that is left.
   */
  width?: string;
}

/** The first column: the record's name, the only cell that may link (UI-LST-002). */
export interface ListTableTitle<T> {
  header: string;
  text: (row: T) => string;
  /** The record's detail route, or undefined for plain text. Omit where no detail route exists. */
  href?: (row: T) => string | undefined;
  /** An avatar or icon before the name. */
  leading?: (row: T) => ReactNode;
  /**
   * Lines under the name, never linked. A value that does not fit a column of
   * its own goes here, rather than making the table scroll sideways (UI-LST-001).
   */
  secondary?: (row: T) => ReactNode[];
  /** As `ListTableColumn.width`: a CSS length or a percentage, never grid syntax. */
  width?: string;
}

export interface ListTableProps<T> {
  rows: T[];
  getRowKey: (row: T) => Key | undefined;
  title: ListTableTitle<T>;
  columns: ListTableColumn<T>[];
  /** Shows skeleton rows in place of the records. */
  isLoading: boolean;
  /** How many skeleton rows a load shows. */
  loadingRows?: number;
  /** Shown in a full-width row when `rows` is empty and not loading. */
  emptyMessage: string;
  /**
   * The trailing kebab of each row. The column is drawn only while some row on
   * screen has actions; a row without any keeps an empty cell (UI-LST-003).
   */
  rowActions?: RowActions<T>;
  /** Mutes a row, e.g. a disabled record. */
  isInactive?: (row: T) => boolean;
  /**
   * A leading selection column, for a page that acts on several rows at once.
   *
   * The page supplies the content: `header` is the tri-state "select all"
   * checkbox and `render(row)` the row's own checkbox, named
   * "Seleccionar <name>", or nothing for a row that cannot be selected. The
   * actions on the selection live outside the table, never in a row.
   */
  selection?: ListTableSelection<T>;
}

export interface ListTableSelection<T> {
  header: ReactNode;
  render: (row: T) => ReactNode;
}

/** Header text in the list-table style, for headers that wrap it (e.g. in a sort label). */
export const ListTableHeaderText = ({ children }: { children: ReactNode }) => (
  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
    {children}
  </Typography>
);

/** Room for the kebab button and the cell's padding. */
const ACTIONS_COLUMN_WIDTH = "72px";

/** The name: at most two lines, cut after that, and at least 32px tall when it is a link. */
const nameSx = {
  fontWeight: 600,
  overflowWrap: "anywhere",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
} as const;

/**
 * Wide-viewport table for a list page (UI-LST-001): a title column holding the
 * record's name, the page's columns, and, while some row has actions, a
 * trailing column whose kebab opens the page's row menu (see RowActionsMenu).
 * With `selection`, a leading checkbox column.
 *
 * The layout is fixed, so the table takes its container's width and never
 * scrolls sideways; a value that does not fit goes under the name.
 */
export const ListTable = <T,>({
  rows,
  getRowKey,
  title,
  columns,
  isLoading,
  loadingRows = 5,
  emptyMessage,
  rowActions,
  isInactive,
  selection,
}: ListTableProps<T>) => {
  const hasActions = (row: T) => !!rowActions && (rowActions.has?.(row) ?? true);
  // While loading, the column is reserved when it may be needed, so the table
  // does not shift as the rows arrive. Once loaded, only a row with actions
  // earns it.
  const showActions = !!rowActions && (isLoading || rows.some(hasActions));
  const colSpan = columns.length + 1 + (showActions ? 1 : 0) + (selection ? 1 : 0);

  return (
    <TableContainer sx={{ overflowX: "hidden" }}>
      <Table sx={{ tableLayout: "fixed", width: "100%" }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: colors.background.surface }}>
            {selection && <TableCell padding="checkbox">{selection.header}</TableCell>}
            <TableCell sx={{ width: title.width }}>
              <ListTableHeaderText>{title.header}</ListTableHeaderText>
            </TableCell>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align} sx={{ width: column.width }}>
                {typeof column.header === "string" ? (
                  <ListTableHeaderText>{column.header}</ListTableHeaderText>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
            {showActions && (
              <TableCell align="center" sx={{ width: ACTIONS_COLUMN_WIDTH }}>
                {/* Named for screen readers; the kebabs speak for themselves on screen. */}
                <Box component="span" sx={visuallyHidden}>
                  Acciones
                </Box>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody aria-busy={isLoading || undefined}>
          {isLoading ? (
            Array.from({ length: loadingRows }, (_, index) => (
              <TableRow key={index} aria-hidden>
                {selection && <TableCell padding="checkbox" />}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
                    <Skeleton variant="text" sx={{ flex: 1 }} />
                  </Box>
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
                {showActions && <TableCell />}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const inactive = isInactive?.(row) ?? false;
              const href = title.href?.(row);
              const secondary = title.secondary?.(row) ?? [];
              const nameColor = inactive ? colors.text.muted : colors.text.primary;
              return (
                <TableRow key={getRowKey(row)}>
                  {selection && <TableCell padding="checkbox">{selection.render(row)}</TableCell>}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      {title.leading?.(row)}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {href ? (
                          <Link
                            component={RouterLink}
                            to={href}
                            underline="hover"
                            variant="body2"
                            sx={{
                              ...nameSx,
                              minHeight: 32,
                              alignContent: "center",
                              color: nameColor,
                              "&:hover": { color: colors.brand.main },
                              "&:focus-visible": {
                                outline: "2px solid",
                                outlineColor: colors.brand.main,
                                outlineOffset: "2px",
                              },
                            }}
                          >
                            {title.text(row)}
                          </Link>
                        ) : (
                          <Typography variant="body2" sx={{ ...nameSx, color: nameColor }}>
                            {title.text(row)}
                          </Typography>
                        )}
                        {secondary.map((line, index) => (
                          <Typography
                            key={index}
                            variant="caption"
                            component="p"
                            sx={{ color: colors.text.subtle, overflowWrap: "anywhere" }}
                          >
                            {line}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align}
                      sx={{ overflowWrap: "anywhere", color: inactive ? colors.text.muted : undefined }}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell align="center">
                      {hasActions(row) && rowActions && (
                        <IconButton
                          size="small"
                          aria-label={rowActions.label(row)}
                          onClick={(e) => rowActions.onClick(e, row)}
                          sx={{
                            color: colors.text.subtle,
                            // eslint-disable-next-line no-restricted-syntax -- icon-button hover tint (Tailwind gray-100); no matching token
                            "&:hover": { backgroundColor: "#f3f4f6" },
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
