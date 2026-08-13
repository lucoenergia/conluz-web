import { useEffect, useMemo, useState, type FC } from "react";
import { Box, Chip, Paper } from "@mui/material";
import { useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { PageHeaderWithStats } from "../../components/PageHeader";
import { LoadingCardGrid } from "../../components/CardGrid";
import { SearchBar } from "../../components/SearchBar/SearchBar";
import { SharingAgreementTimeline } from "../../components/SharingAgreementTimeline";
import { useErrorDispatch } from "../../context/error.context";
import { useDebounce } from "../../utils/useDebounce";
import { SharingAgreementResponseStatus } from "../../api/models";
import { useSharingAgreementsData } from "./useSharingAgreementsData";
import { filterSharingAgreements, type SharingAgreementStatusFilter } from "./sharingAgreementFilters";
import { getSharingAgreementStatusColor, getSharingAgreementStatusLabel } from "./sharingAgreementStatus";

const STATUS_FILTERS: SharingAgreementStatusFilter[] = [
  "all",
  SharingAgreementResponseStatus.DRAFT,
  SharingAgreementResponseStatus.PUBLISHED,
  SharingAgreementResponseStatus.SUPERSEDED,
];

const SINGLE_COLUMN = { xs: 1, sm: 1, md: 1, lg: 1 };

export const SharingAgreementsPage: FC = () => {
  const { plantId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const { agreements, plant, counts, isLoading, isNotFound, error } = useSharingAgreementsData(plantId);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<SharingAgreementStatusFilter>("all");
  const debouncedSearchText = useDebounce(searchText, 500);

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar los acuerdos de reparto. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  const filteredAgreements = useMemo(
    () => filterSharingAgreements(agreements, debouncedSearchText, statusFilter),
    [agreements, debouncedSearchText, statusFilter],
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: colors.background.default,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={sxStyles.pageContainer}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" },
            { label: "Planta", href: `/production/${plantId}` },
            { label: "Acuerdos de Reparto", href: "#" },
          ]}
        />
      </Box>

      {isNotFound ? (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Planta no encontrada"
            subtitle="Esta planta no existe o no tienes acceso a su comunidad."
          />
        </Box>
      ) : (
        <>
          <Box sx={sxStyles.pageContainer}>
            <PageHeaderWithStats
              icon={HandshakeOutlinedIcon}
              title={plant?.name || "Planta de Producción"}
              subtitle={plant?.regulatoryCode ? `CAU: ${plant.regulatoryCode}` : "CAU no disponible"}
              stats={[
                { value: counts.vigentes, label: "Vigente" },
                { value: counts.drafts, label: "Borradores", color: colors.warning },
                { value: counts.historicos, label: "Históricos" },
              ]}
            />
          </Box>

          <Box sx={sxStyles.pageContainer}>
            <Paper elevation={0} sx={sxStyles.softPanel}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    overflowX: "auto",
                    flexWrap: "nowrap",
                    pb: 0.5,
                  }}
                >
                  {STATUS_FILTERS.map((status) => (
                    <Chip
                      key={status}
                      label={status === "all" ? "Todos" : getSharingAgreementStatusLabel(status)}
                      onClick={() => setStatusFilter(status)}
                      color={
                        statusFilter === status
                          ? status === "all"
                            ? "primary"
                            : getSharingAgreementStatusColor(status)
                          : "default"
                      }
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  ))}
                </Box>

                <SearchBar
                  value={searchText}
                  onChange={setSearchText}
                  placeholder="Buscar por nombre o notas..."
                />
              </Box>
            </Paper>
          </Box>

          {isLoading && (
            <Box sx={sxStyles.pageContainer}>
              <LoadingCardGrid columns={SINGLE_COLUMN} />
            </Box>
          )}

          {!isLoading && !error && filteredAgreements.length > 0 && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementTimeline plantId={plantId} agreements={filteredAgreements} />
            </Box>
          )}

          {!isLoading && !error && filteredAgreements.length === 0 && (
            <Box sx={sxStyles.pageContainer}>
              <EmptyState
                icon={HandshakeOutlinedIcon}
                title="No se encontraron acuerdos de reparto"
                subtitle={
                  agreements.length === 0
                    ? "Esta planta todavía no tiene acuerdos de reparto registrados."
                    : "No hay acuerdos de reparto que coincidan con los filtros aplicados."
                }
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
