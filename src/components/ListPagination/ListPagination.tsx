import type { FC } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { sxStyles } from "../../theme/sx";
import { PaginationOutlined } from "../Pagination/Pagination";
import { useListLayout } from "../ResponsiveRecordList/useListLayout";
import { LIST_PAGE_SIZE } from "./paging";

export interface ListPaginationProps {
  /** The 1-based page shown. */
  page: number;
  pageCount: number;
  /** How many rows the list holds. */
  total: number;
  pageSize?: number;
  /** What the rows are, in both numbers: { one: "miembro", other: "miembros" }. */
  noun: { one: string; other: string };
  onChange: (page: number) => void;
}

const pageLabel = (type: string, page: number | null, selected: boolean) => {
  switch (type) {
    case "previous":
      return "Página anterior";
    case "next":
      return "Página siguiente";
    case "first":
      return "Primera página";
    case "last":
      return "Última página";
    default:
      return selected ? `Página ${page}, la actual` : `Ir a la página ${page}`;
  }
};

/**
 * The pages of a records list (UI-LST-005): nothing at all up to one page. The
 * narrow layout gets previous, "current of total" and next, each a full touch
 * target; the wide one, the page numbers too.
 */
export const ListPagination: FC<ListPaginationProps> = ({
  page,
  pageCount,
  total,
  pageSize = LIST_PAGE_SIZE,
  noun,
  onChange,
}) => {
  const layout = useListLayout();
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const navLabel = `Páginas de ${noun.other}`;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {start}–{end} de {total} {total === 1 ? noun.one : noun.other}
      </Typography>
      {layout === "narrow" ? (
        <Box component="nav" aria-label={navLabel} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            sx={sxStyles.touchTarget}
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {page} de {pageCount}
          </Typography>
          <IconButton
            aria-label="Página siguiente"
            disabled={page >= pageCount}
            onClick={() => onChange(page + 1)}
            sx={sxStyles.touchTarget}
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>
      ) : (
        <PaginationOutlined
          ariaLabel={navLabel}
          getItemAriaLabel={pageLabel}
          count={pageCount}
          page={page}
          handleChange={(_, value) => onChange(value)}
        />
      )}
    </Box>
  );
};
