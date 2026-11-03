import { useMemo, useState, type FC, type MouseEvent } from "react";
import { Box, Button, Chip, Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import AddIcon from "@mui/icons-material/Add";
import { sxStyles } from "../../theme/sx";
import { colors, interactiveTransition, motion} from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { DetailHeader } from "../../components/DetailHeader";
import { SearchBar } from "../../components/SearchBar/SearchBar";
import { ResponsiveRecordList } from "../../components/ResponsiveRecordList";
import { ListTable } from "../../components/ListTable";
import { RecordList, type RecordListItem } from "../../components/RecordList";
import { ListPagination } from "../../components/ListPagination";
import { useListPage } from "../../components/ListPagination/useListPage";
import { SharingAgreementFormDialog, type SharingAgreementFormValues } from "../../components/SharingAgreementFormDialog";
import { DeleteSharingAgreementConfirmationModal } from "../../components/Modals/DeleteSharingAgreementConfirmationModal";
import { useDebounce } from "../../utils/useDebounce";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import { useSharingAgreementsData } from "./useSharingAgreementsData";
import { usePlantActions, useSharingAgreementActions } from "../../hooks/actions";
import { filterSharingAgreements, type SharingAgreementStatusFilter } from "./sharingAgreementFilters";
import { getSharingAgreementStatusLabel } from "./sharingAgreementStatus";
import {
  deletableFromRow,
  offersSharingAgreementRowActions,
  sharingAgreementTableColumns,
  sharingAgreementTableTitle,
  toRecordListItem,
} from "./sharingAgreementRows";
import { SharingAgreementRowMenu } from "./SharingAgreementRowMenu";

const STATUS_FILTERS: SharingAgreementStatusFilter[] = [
  "all",
  SharingAgreementResponseStatus.DRAFT,
  SharingAgreementResponseStatus.PUBLISHED,
  SharingAgreementResponseStatus.SUPERSEDED,
];

export const SharingAgreementsPage: FC = () => {
  const { plantId = "" } = useParams();
  const navigate = useNavigate();
  const { agreements, plant, counts, isLoading, isNotFound, error, refetch } = useSharingAgreementsData(plantId);
  // Creating is authorised by the plant, the rest by the agreement itself.
  const { createSharingAgreement } = usePlantActions().forPlant(plant).actions;
  const { forAgreement } = useSharingAgreementActions(plantId);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<SharingAgreementStatusFilter>("all");
  const debouncedSearchText = useDebounce(searchText, 500);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  // Ids, not agreements: the list is refetched around the delete, so a stored
  // object would be the pre-invalidation copy by the time it is used.
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuAgreementId, setMenuAgreementId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const agreementById = (id: string | null) => agreements.find((agreement) => agreement.id === id);
  // One answer for the kebab, its menu and the dialog (deletableFromRow).
  const removableFromRow = (agreement: SharingAgreementResponse | undefined) =>
    deletableFromRow(agreement, forAgreement(agreement));
  const deleteTarget = agreementById(deleteTargetId);
  const removeAgreement = removableFromRow(deleteTarget);
  const menuRemove = removableFromRow(agreementById(menuAgreementId));

  const filteredAgreements = useMemo(
    () => filterSharingAgreements(agreements, debouncedSearchText, statusFilter),
    [agreements, debouncedSearchText, statusFilter],
  );

  // The whole list is read at once and paged here, 25 rows at a time
  // (UI-LST-005). A new search or filter starts again from the first page.
  const { page, setPage, pageCount, pageRows } = useListPage(filteredAgreements);
  const changeSearch = (text: string) => {
    setSearchText(text);
    setPage(1);
  };
  const changeStatusFilter = (status: SharingAgreementStatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };
  const clearFilters = () => {
    changeSearch("");
    changeStatusFilter("all");
  };

  const agreementOfItem = (item: RecordListItem) => agreementById(item.id);
  const hasRowActions = (agreement: SharingAgreementResponse) =>
    offersSharingAgreementRowActions(agreement, forAgreement(agreement));
  const rowActionsLabel = (agreement: SharingAgreementResponse) => `Más acciones para ${agreement.name}`;
  // Over the whole filtered list, not the page, so every page of it looks the same.
  const chevron = !filteredAgreements.some(hasRowActions);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, agreement: SharingAgreementResponse) => {
    setMenuAnchor(event.currentTarget);
    setMenuAgreementId(agreement.id);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleCreateSubmit = async (values: SharingAgreementFormValues) => {
    if (!createSharingAgreement) return;
    const response = await createSharingAgreement.run(values);
    if (!response) return;
    setIsCreateDialogOpen(false);
    // `id` is optional on SharingAgreementResponse — the list query is already
    // invalidated above, so if it's somehow missing we still land somewhere
    // correct (the list, showing the new agreement) instead of a route
    // containing the literal string "undefined".
    if (response.id) {
      navigate(`/production/${plantId}/sharing-agreements/${response.id}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!removeAgreement) return;
    const success = await removeAgreement.run();
    if (success) setDeleteTargetId(null);
  };

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
      <Box sx={{ ...sxStyles.pageContainer, pt: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" },
            { label: "Planta", href: `/production/${plantId}` },
            { label: "Acuerdos de reparto", href: "#" },
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
            <DetailHeader
              variant="list"
              icon={<HandshakeOutlinedIcon />}
              title={plant?.name || "Planta de Producción"}
              subtitle={plant?.regulatoryCode ? `CAU: ${plant.regulatoryCode}` : "CAU no disponible"}
              keyFacts={[
                { label: "Vigente", value: counts.vigentes },
                { label: "Borradores", value: counts.drafts },
                { label: "Históricos", value: counts.historicos },
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
                {createSharingAgreement && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateDialogOpen(true)}
                  sx={{
                    background: (theme) => theme.palette.primary.main,
                    px: 3,
                    py: 1.5,
                    boxShadow: (theme) => `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                    "&:hover": {
                      transform: `translateY(${motion.lift})`,
                      boxShadow: (theme) => `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                    },
                    transition: interactiveTransition("0.3s", "ease"),
                  }}
                >
                  Nuevo acuerdo de reparto
                </Button>
                )}

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
                      onClick={() => changeStatusFilter(status)}
                      // The brand colour for whichever filter is selected: no status is a failure (UI-AGR-016).
                      color={statusFilter === status ? "primary" : "default"}
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  ))}
                </Box>

                <SearchBar
                  value={searchText}
                  onChange={changeSearch}
                  placeholder="Buscar por nombre o notas..."
                />
              </Box>
            </Paper>
          </Box>

          <Box sx={sxStyles.pageContainerFull}>
            <ResponsiveRecordList
              // A failed read says so and offers the read again, never the empty state (UI-LST-004).
              error={error ? { message: "No se pudieron cargar los acuerdos de reparto.", onRetry: refetch } : undefined}
              empty={
                isLoading || error || filteredAgreements.length > 0 ? undefined : agreements.length === 0 ? (
                  <EmptyState
                    icon={HandshakeOutlinedIcon}
                    title="No se encontraron acuerdos de reparto"
                    subtitle="Esta planta todavía no tiene acuerdos de reparto registrados."
                  />
                ) : (
                  // Agreements exist, so it is the search or the status filter that hides them.
                  <EmptyState
                    icon={SearchOffIcon}
                    title="No hay acuerdos de reparto que coincidan"
                    subtitle="Prueba con otra búsqueda u otro estado."
                    actionButton={{ label: "Limpiar filtros", onClick: clearFilters }}
                  />
                )
              }
              wide={
                <ListTable
                  // The API's order, newest first: the page never sorts (UI-AGR-015).
                  rows={pageRows}
                  getRowKey={(agreement) => agreement.id}
                  isLoading={isLoading}
                  rowActions={{ label: rowActionsLabel, onClick: handleMenuOpen, has: hasRowActions }}
                  title={sharingAgreementTableTitle(plantId)}
                  columns={sharingAgreementTableColumns}
                />
              }
              narrow={
                <RecordList
                  label="Acuerdos de reparto"
                  isLoading={isLoading}
                  chevron={chevron}
                  rowActions={{
                    label: (item) => {
                      const agreement = agreementOfItem(item);
                      return agreement ? rowActionsLabel(agreement) : `Más acciones para ${item.title}`;
                    },
                    onClick: (event, item) => {
                      const agreement = agreementOfItem(item);
                      if (agreement) handleMenuOpen(event, agreement);
                    },
                    has: (item) => {
                      const agreement = agreementOfItem(item);
                      return !!agreement && hasRowActions(agreement);
                    },
                  }}
                  items={pageRows.map(toRecordListItem(plantId))}
                />
              }
              footer={
                !isLoading && (
                  <ListPagination
                    page={page}
                    pageCount={pageCount}
                    total={filteredAgreements.length}
                    noun={{ one: "acuerdo de reparto", other: "acuerdos de reparto" }}
                    onChange={setPage}
                  />
                )
              }
            />
          </Box>
        </>
      )}

      {isCreateDialogOpen && createSharingAgreement && (
        <SharingAgreementFormDialog
          key="create"
          isOpen
          mode="create"
          plantName={plant?.name}
          initialValues={{ installedPowerKw: plant?.totalPower }}
          isSubmitting={createSharingAgreement.isPending}
          onCancel={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateSubmit}
        />
      )}

      <SharingAgreementRowMenu
        anchorEl={menuAnchor}
        onClose={handleMenuClose}
        remove={menuRemove}
        onDelete={() => setDeleteTargetId(menuAgreementId)}
      />

      {deleteTarget && removeAgreement && (
        <DeleteSharingAgreementConfirmationModal
          isOpen
          agreementName={deleteTarget.name || "Acuerdo de reparto"}
          isDeleting={removeAgreement.isPending}
          onCancel={() => setDeleteTargetId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </Box>
  );
};
