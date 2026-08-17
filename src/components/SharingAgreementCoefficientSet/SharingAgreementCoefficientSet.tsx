import { useMemo, useState, type FC } from "react";
import { Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { EmptyState } from "../EmptyState";
import { SearchBar } from "../SearchBar/SearchBar";
import { SharingAgreementCoefficientCard, SharingAgreementCoefficientTableRow } from "../SharingAgreementCoefficientRow";
import { useDebounce } from "../../utils/useDebounce";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import {
  filterSharingAgreementCoefficients,
  type SharingAgreementCoefficientApplicationStateFilter,
} from "../../pages/production/sharingAgreementCoefficientFilters";
import { getApplicationStateLabel } from "../../pages/production/sharingAgreementCoefficientState";

export interface SharingAgreementCoefficientSetProps {
  coefficients: SharingAgreementPartitionCoefficientResponse[];
}

// A deliberate 3-chip cut for this slice: applicationState only. The design
// mock-up shows a fourth "Cerrados" chip keyed on endState instead — left for
// a later issue, not an oversight.
const APPLICATION_STATE_FILTERS: SharingAgreementCoefficientApplicationStateFilter[] = [
  "all",
  SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
];

export const SharingAgreementCoefficientSet: FC<SharingAgreementCoefficientSetProps> = ({ coefficients }) => {
  const [searchText, setSearchText] = useState("");
  const [applicationStateFilter, setApplicationStateFilter] = useState<SharingAgreementCoefficientApplicationStateFilter>("all");
  const debouncedSearchText = useDebounce(searchText, 500);

  const filteredCoefficients = useMemo(
    () => filterSharingAgreementCoefficients(coefficients, debouncedSearchText, applicationStateFilter),
    [coefficients, debouncedSearchText, applicationStateFilter],
  );

  if (coefficients.length === 0) {
    return (
      <EmptyState
        icon={HandshakeOutlinedIcon}
        title="Sin coeficientes de reparto"
        subtitle="Este acuerdo todavía no tiene coeficientes. Podrás adjuntar un fichero o editarlos manualmente más adelante."
      />
    );
  }

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, overflowX: "auto", flexWrap: "nowrap", pb: 0.5 }}>
          {APPLICATION_STATE_FILTERS.map((state) => (
            <Chip
              key={state}
              label={state === "all" ? "Todos" : getApplicationStateLabel(state)}
              onClick={() => setApplicationStateFilter(state)}
              color={applicationStateFilter === state ? (state === "all" ? "primary" : "default") : "default"}
              variant={applicationStateFilter === state ? "filled" : "outlined"}
              size="small"
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>

        <SearchBar value={searchText} onChange={setSearchText} placeholder="Buscar por punto o CUPS" />
      </Box>

      {filteredCoefficients.length === 0 ? (
        <EmptyState
          icon={SearchOffIcon}
          title="No se encontraron coeficientes"
          subtitle="No hay coeficientes que coincidan con los filtros aplicados."
        />
      ) : (
        <>
          {/* Desktop table */}
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: colors.background.surface }}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Punto
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      CUPS
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Coeficiente
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Estado de aplicación
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Estado de fin
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCoefficients.map((coefficient) => (
                  <SharingAgreementCoefficientTableRow key={coefficient.coefficientId} coefficient={coefficient} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile stacked cards */}
          <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column" }}>
            {filteredCoefficients.map((coefficient) => (
              <SharingAgreementCoefficientCard key={coefficient.coefficientId} coefficient={coefficient} />
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
};
