import type { Key, MouseEvent, ReactNode } from "react";
import {
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { colors } from "../../theme/tokens";

export interface ListTableColumn<T> {
  key: string;
  /** A string renders as the standard header text; a node renders as is (sort label, icon header). */
  header: ReactNode;
  align?: "left" | "center";
  cellSx?: SxProps<Theme>;
  render: (row: T) => ReactNode;
}

export interface ListTableProps<T> {
  rows: T[];
  getRowKey: (row: T) => Key | undefined;
  columns: ListTableColumn<T>[];
  isLoading: boolean;
  /** Shown in a full-width row when `rows` is empty and not loading. */
  emptyMessage: string;
  /** Accessible name of the row's actions button. */
  rowActionsLabel: (row: T) => string;
  onRowActionsClick: (event: MouseEvent<HTMLElement>, row: T) => void;
  /**
   * Whether this row has any action to offer. Every row does, by default.
   *
   * A page whose menu is built from capabilities can reach a row with nothing
   * in it. That row gets no button rather than one that opens an empty menu:
   * the kebab is a promise of something to do, and the column stays so the
   * table does not reflow around it.
   */
  hasRowActions?: (row: T) => boolean;
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

/**
 * Desktop table for a list page: one row per record and a trailing "Acciones"
 * column whose kebab button opens the page's row menu (see RowActionsMenu),
 * and, with `selection`, a leading checkbox column.
 */
export const ListTable = <T,>({
  rows,
  getRowKey,
  columns,
  isLoading,
  emptyMessage,
  rowActionsLabel,
  onRowActionsClick,
  hasRowActions,
  selection,
}: ListTableProps<T>) => {
  const colSpan = columns.length + 1 + (selection ? 1 : 0);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: colors.background.surface }}>
            {selection && <TableCell padding="checkbox">{selection.header}</TableCell>}
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align}>
                {typeof column.header === "string" ? (
                  <ListTableHeaderText>{column.header}</ListTableHeaderText>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
            <TableCell align="center">
              <ListTableHeaderText>Acciones</ListTableHeaderText>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                sx={{
                  "&:hover": { backgroundColor: colors.background.surface },
                  transition: "background-color 0.2s",
                }}
              >
                {selection && <TableCell padding="checkbox">{selection.render(row)}</TableCell>}
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align} sx={column.cellSx}>
                    {column.render(row)}
                  </TableCell>
                ))}
                <TableCell align="center">
                  {(hasRowActions?.(row) ?? true) && (
                  <IconButton
                    size="small"
                    aria-label={rowActionsLabel(row)}
                    onClick={(e) => onRowActionsClick(e, row)}
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
