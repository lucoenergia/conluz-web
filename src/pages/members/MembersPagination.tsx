import type { FC } from "react";
import { Box, IconButton, Pagination, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { sxStyles } from "../../theme/sx";
import { MEMBERS_PAGE_SIZE } from "./memberFilters";

interface MembersPaginationProps {
  /** The 1-based page shown. */
  page: number;
  pageCount: number;
  /** How many rows the filtered result holds. */
  total: number;
  onChange: (page: number) => void;
  isNarrow: boolean;
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
 * The pages of the filtered members (#331). A phone gets previous, "current
 * of total" and next, each a full touch target; a wider screen, the page
 * numbers too.
 */
export const MembersPagination: FC<MembersPaginationProps> = ({ page, pageCount, total, onChange, isNarrow }) => {
  const start = (page - 1) * MEMBERS_PAGE_SIZE + 1;
  const end = Math.min(page * MEMBERS_PAGE_SIZE, total);

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
        {start}–{end} de {total} miembros
      </Typography>
      {isNarrow ? (
        <Box component="nav" aria-label="Páginas de miembros" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
        <Pagination
          aria-label="Páginas de miembros"
          count={pageCount}
          page={page}
          onChange={(_, value) => onChange(value)}
          color="primary"
          getItemAriaLabel={pageLabel}
        />
      )}
    </Box>
  );
};
