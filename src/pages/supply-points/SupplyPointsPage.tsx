import { useEffect, useMemo, useState, type FC, type MouseEvent, type SyntheticEvent } from "react";
import { Box, Button, Paper } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { colors, interactiveTransition, motion} from "../../theme/tokens";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import { useGetSuppliesByUserId, useGetUserById } from "../../api/users/users";
import type { SupplyResponse } from "../../api/models";
import { BreadCrumb } from "../../components/Breadcrumb";
import { SearchBar } from "../../components/SearchBar/SearchBar";
import { DetailHeader } from "../../components/DetailHeader";
import { FilterChipsBar, type FilterStatus } from "../../components/FilterChips";
import { ResponsiveRecordList } from "../../components/ResponsiveRecordList";
import { ListTable } from "../../components/ListTable";
import { RecordList, type RecordListItem } from "../../components/RecordList";
import { DisableConfirmationModal } from "../../components/Modals/DisableConfirmationModal";
import { DisableSuccessModal } from "../../components/Modals/DisableSuccessModal";
import { EnableConfirmationModal } from "../../components/Modals/EnableConfirmationModal";
import { EnableSuccessModal } from "../../components/Modals/EnableSuccesModal";
import { EmptyState } from "../../components/EmptyState";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useErrorDispatch } from "../../context/error.context";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import { ImportSuppliesDialog } from "./ImportSuppliesDialog";
import { useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { useActiveCommunity } from "../../context/community.context";
import { isSupplyOutsideActiveCommunity } from "./supplyCommunityScope";
import { useCommunityActions, useSupplyActions } from "../../hooks/actions";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { SupplyDeletionDialog } from "./SupplyDeletionDialog";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { useActiveCommunityCapabilities } from "../../hooks/permissions";
import { offersSupplyRowActions, supplyTableColumns, supplyTableTitle, toRecordListItem } from "./supplyRows";
import { SupplyRowMenu } from "./SupplyRowMenu";

/** A disable or enable the caller has asked for, by supply id, and where it stands. */
type StatusChange = { supplyId: string; kind: "disable" | "enable"; step: "confirm" | "done" };

export const SupplyPointsPage: FC = () => {
  const theme = useTheme();
  const activeCommunityId = useActiveCommunity();
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showImportModal, setShowImportModal] = useState(false);
  // The id, not the supply: the supply is resolved from the list on every
  // render, so the dialog answers from the current read, and closes once a
  // deleted supply has left it.
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // The row menu and the status change it starts, by id for the same reason.
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuSupplyId, setMenuSupplyId] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const [searchParams] = useSearchParams();
  const personId = searchParams.get("personId");

  const { data: allData, isLoading: isLoadingAll, error: errorAll, refetch: refetchAll } = useGetAllSupplies(
    activeCommunityId ?? "",
    { size: 10000 },
    { query: { enabled: !personId && !!activeCommunityId } },
  );
  const { data: userSupplies = [], isLoading: isLoadingUser, error: errorUser, refetch: refetchUser } =
    useGetSuppliesByUserId(personId ?? "", { query: { enabled: !!personId && !!activeCommunityId } });
  const { data: personData } = useGetUserById(personId ?? "", { query: { enabled: !!personId } });

  /**
   * GET /users/{userId}/supplies is scoped to what the caller may read, not to
   * the community on screen. Since conluz#326 every row is one this caller is
   * entitled to -- but "may read" is plural: an admin of two communities
   * viewing a member of both receives both communities' supplies, while the
   * selector names one. Listing them together would present another
   * community's supplies under this one's heading, and offer actions scoped to
   * the wrong community.
   *
   * The community-scoped branch needs no such filter: its communityId is in
   * the path, so it re-keys by itself when the selection changes.
   */
  const userSuppliesInCommunity = useMemo(
    () => userSupplies.filter((supply) => !isSupplyOutsideActiveCommunity(supply, activeCommunityId)),
    [userSupplies, activeCommunityId],
  );

  const responseFromApi = useMemo<SupplyResponse[]>(
    () => (personId ? userSuppliesInCommunity : (allData?.items ?? [])),
    [personId, userSuppliesInCommunity, allData?.items],
  );
  // Whether the rows name their owner (UI-SUP-011). Until the answer arrives
  // the list stays loading, so rows never gain an owner after they are drawn.
  // A failed read shows them without: hiding the owner discloses nothing, and
  // the list is not this read's to block.
  const canManage = useActiveCommunityCapabilities("canManage");
  const showOwner = canManage.state === "allowed";
  const isLoading = (personId ? isLoadingUser : isLoadingAll) || canManage.state === "pending";
  const error = personId ? errorUser : errorAll;
  const refetch = personId ? refetchUser : refetchAll;

  // What this caller may do, as the backend answers it. forSupply is a plain
  // function rather than a hook precisely so it can be asked once per row.
  const { forSupply } = useSupplyActions();
  const activeCommunity = useActiveCommunityResource();
  const activeCommunityName = useActiveCommunityName();
  const { actions: communityActions } = useCommunityActions().forCommunity(activeCommunity);

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar los puntos de suministro. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  const filteredItems: SupplyResponse[] = useMemo(() => {
    let items = responseFromApi;

    // Filter by search text
    if (searchText) {
      // The label is what the row shows, so what is shown can be found.
      items = items.filter((item) =>
        supplyDisplayLabel(item).toLowerCase().includes(searchText.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.address?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      items = items.filter((item) =>
        filterStatus === "active" ? item.enabled : !item.enabled
      );
    }

    return items;
  }, [searchText, responseFromApi, filterStatus]);

  const stats = useMemo(() => {
    const total = responseFromApi.length;
    const active = responseFromApi.filter(item => item.enabled).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [responseFromApi]);

  const supplyById = (id: string | null) => responseFromApi.find((supply) => supply.id === id);
  const hasRowActions = (supply: SupplyResponse) => offersSupplyRowActions(forSupply(supply));
  const rowActionsLabel = (supply: SupplyResponse) => `Más acciones para ${supplyDisplayLabel(supply)}`;
  // Over the whole list, not the page, so every page of it looks the same.
  const chevron = !filteredItems.some(hasRowActions);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, supply: SupplyResponse) => {
    setMenuAnchor(event.currentTarget);
    setMenuSupplyId(supply.id);
  };
  const handleMenuClose = () => setMenuAnchor(null);
  const menuSupply = supplyById(menuSupplyId);
  const supplyOfItem = (item: RecordListItem) => supplyById(item.id);

  const statusChangeSupply = supplyById(statusChange?.supplyId ?? null);
  const statusChangeCode = statusChangeSupply?.code ?? "";
  const closeStatusChange = (event?: SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setStatusChange(null);
  };
  // The confirmation closes before the request is sent, so it holds no request
  // in flight; the success dialog follows only if the change went through.
  const confirmStatusChange = async () => {
    if (!statusChange) return;
    const { supplyId, kind } = statusChange;
    setStatusChange(null);
    const action = forSupply(supplyById(supplyId)).actions[kind];
    if (!action) return;
    if (await action.run()) setStatusChange({ supplyId, kind, step: "done" });
  };

  const handleOpenImportModal = () => {
    setShowImportModal(true);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
  };

  const handleImportComplete = () => {
    refetch();
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
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={sxStyles.pageContainer}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            ...(personId ? [{ label: "Miembros", href: "/members" }] : []),
            { label: "Puntos de Suministro", href: "/supply-points" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={sxStyles.pageContainer}>
        <DetailHeader
          variant="list"
          icon={<ElectricMeterIcon />}
          title="Puntos de Suministro"
          subtitle={
            personId
              ? `Usuario: ${personData?.fullName ?? "..."}`
              : "Gestiona los puntos de suministro de la comunidad energética"
          }
          keyFacts={[
            { label: "Total", value: stats.total },
            { label: "Activos", value: stats.active },
            { label: "Dados de baja", value: stats.inactive },
          ]}
        />
      </Box>

      {/* Controls Section */}
      <Box sx={sxStyles.pageContainer}>
        <Paper
          elevation={0}
          sx={sxStyles.softPanel}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
            }}
          >
          {/* Action Buttons. Each is mounted only when the backend hands over
              the action behind it -- never disabled, which would advertise
              something the caller cannot do. */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {communityActions.createSupply && (
            <Button
              component={Link}
              to="/supply-points/new"
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              sx={{
                background: theme.palette.primary.main,
                px: 3,
                py: 1.5,
                boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                "&:hover": {
                  transform: `translateY(${motion.lift})`,
                  boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                },
                transition: interactiveTransition("0.3s", "ease"),
              }}
            >
              Nuevo Punto de Suministro
            </Button>
            )}
            {communityActions.importSupplies && (
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={handleOpenImportModal}
              sx={{
                px: 3,
                py: 1.5,
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                "&:hover": {
                  transform: `translateY(${motion.lift})`,
                  borderColor: theme.palette.primary.dark,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
                transition: interactiveTransition("0.3s", "ease"),
              }}
            >
              Importar CSV
            </Button>
            )}
          </Box>

          {/* Filter Chips */}
          <FilterChipsBar value={filterStatus} onChange={setFilterStatus} />

          {/* Search Bar */}
          <SearchBar value={searchText} onChange={setSearchText} />
          </Box>
        </Paper>
      </Box>

      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <ResponsiveRecordList
          empty={
            !isLoading && !error && filteredItems.length === 0 ? (
              <EmptyState
                icon={ElectricMeterIcon}
                title="No se encontraron puntos de suministro"
                subtitle={
                  searchText
                    ? `No hay resultados para "${searchText}"`
                    : communityActions.createSupply
                      ? "Comienza agregando tu primer punto de suministro"
                      // A member cannot add one, so inviting them to is an
                      // instruction they can only fail to follow.
                      : "Todavía no hay ningún punto de suministro asociado a tu cuenta en esta comunidad."
                }
                actionButton={
                  !searchText && communityActions.createSupply
                    ? {
                        label: "Crear Punto de Suministro",
                        onClick: () => navigate("/supply-points/new"),
                        startIcon: <AddCircleOutlineIcon />,
                      }
                    : undefined
                }
              />
            ) : undefined
          }
          wide={
            <ListTable
              rows={filteredItems}
              getRowKey={(supply) => supply.id}
              isLoading={isLoading}
              rowActions={{ label: rowActionsLabel, onClick: handleMenuOpen, has: hasRowActions }}
              isInactive={(supply) => !supply.enabled}
              title={supplyTableTitle}
              columns={supplyTableColumns({ showOwner })}
            />
          }
          narrow={
            <RecordList
              label="Puntos de suministro"
              isLoading={isLoading}
              chevron={chevron}
              rowActions={{
                label: (item) => {
                  const supply = supplyOfItem(item);
                  return supply ? rowActionsLabel(supply) : `Más acciones para ${item.title}`;
                },
                onClick: (event, item) => {
                  const supply = supplyOfItem(item);
                  if (supply) handleMenuOpen(event, supply);
                },
                has: (item) => {
                  const supply = supplyOfItem(item);
                  return !!supply && hasRowActions(supply);
                },
              }}
              items={filteredItems.map((supply) => toRecordListItem(supply, { showOwner }))}
            />
          }
        />
      </Box>

      <SupplyRowMenu
        anchorEl={menuAnchor}
        onClose={handleMenuClose}
        supply={menuSupply}
        actions={forSupply(menuSupply).actions}
        onDisable={() => menuSupply && setStatusChange({ supplyId: menuSupply.id, kind: "disable", step: "confirm" })}
        onEnable={() => menuSupply && setStatusChange({ supplyId: menuSupply.id, kind: "enable", step: "confirm" })}
        onDelete={() => menuSupply && setDeleteTargetId(menuSupply.id)}
      />

      <DisableConfirmationModal
        isOpen={statusChange?.kind === "disable" && statusChange.step === "confirm"}
        code={statusChangeCode}
        onCancel={closeStatusChange}
        onDisable={confirmStatusChange}
      />
      <DisableSuccessModal
        isOpen={statusChange?.kind === "disable" && statusChange.step === "done"}
        code={statusChangeCode}
        onClose={closeStatusChange}
      />
      <EnableConfirmationModal
        isOpen={statusChange?.kind === "enable" && statusChange.step === "confirm"}
        code={statusChangeCode}
        onCancel={closeStatusChange}
        onEnable={confirmStatusChange}
      />
      <EnableSuccessModal
        isOpen={statusChange?.kind === "enable" && statusChange.step === "done"}
        code={statusChangeCode}
        onClose={closeStatusChange}
      />

      {/* Mounted on open, so every opening starts from the guide, and with its
          button's gate: no import action, nothing that can open it. The page
          refetches what it lists itself, because a list filtered to one person
          is a listing the supplies invalidation does not reach. */}
      {showImportModal && communityActions.importSupplies && (
        <ImportSuppliesDialog
          communityName={activeCommunityName}
          importSupplies={communityActions.importSupplies}
          onImported={handleImportComplete}
          onClose={handleCloseImportModal}
        />
      )}

      <SupplyDeletionDialog
        supply={supplyById(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
      />
    </Box>
  );
};