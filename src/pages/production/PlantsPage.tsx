import { useMemo, useState, type FC, type MouseEvent } from "react";
import { Box, Button, Paper } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { colors, interactiveTransition, motion} from "../../theme/tokens";
import { useGetAllPlants } from "../../api/plants/plants";
import type { PlantResponse } from "../../api/models";
import { BreadCrumb } from "../../components/Breadcrumb";
import { SearchBar } from "../../components/SearchBar/SearchBar";
import { DetailHeader } from "../../components/DetailHeader";
import { ResponsiveRecordList } from "../../components/ResponsiveRecordList";
import { ListTable } from "../../components/ListTable";
import { RecordList, type RecordListItem } from "../../components/RecordList";
import { ListPagination } from "../../components/ListPagination";
import { useListPage } from "../../components/ListPagination/useListPage";
import { EmptyState } from "../../components/EmptyState";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { Link, useNavigate } from "react-router";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useActiveCommunity } from "../../context/community.context";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { useCommunityActions, usePlantActions } from "../../hooks/actions";
import { offersPlantRowActions, plantTableColumns, plantTableTitle, toRecordListItem } from "./plantRows";
import { PlantRowMenu } from "./PlantRowMenu";
import { PlantDeletionDialog } from "./PlantDeletionDialog";

export const PlantsPage: FC = () => {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");
  // Ids, not plants: the plant is resolved from the list on every render, so
  // the menu and the dialog answer from the current read.
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuPlantId, setMenuPlantId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const navigate = useNavigate();
  const activeCommunityId = useActiveCommunity();
  const { data: { items: responseFromApi = [] } = {}, isLoading, error, refetch } = useGetAllPlants(
    activeCommunityId ?? "",
    { size: 10000 },
    { query: { enabled: !!activeCommunityId } },
  );
  const activeCommunity = useActiveCommunityResource();
  const { createPlant } = useCommunityActions().forCommunity(activeCommunity).actions;
  const { forPlant } = usePlantActions();

  const filteredItems: PlantResponse[] = useMemo(() => {
    let items = responseFromApi;

    // Only what the row shows can be searched (UI-PLS-002): a match on a
    // hidden value would return a row with no visible reason for it.
    if (searchText) {
      const text = searchText.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(text) ||
        item.regulatoryCode?.toLowerCase().includes(text) ||
        item.address.toLowerCase().includes(text)
      );
    }

    return items;
  }, [searchText, responseFromApi]);

  // The whole list is read at once (size 10000) and paged here, 25 rows at a
  // time (UI-LST-005). A new search starts again from the first page.
  const { page, setPage, pageCount, pageRows } = useListPage(filteredItems);
  const changeSearch = (text: string) => {
    setSearchText(text);
    setPage(1);
  };

  const stats = useMemo(() => {
    const total = responseFromApi.length;
    const totalPower = responseFromApi.reduce((sum, item) => sum + (item.totalPower || 0), 0);
    return { total, totalPower };
  }, [responseFromApi]);

  const plantById = (id: string | null) => responseFromApi.find((plant) => plant.id === id);
  const plantOfItem = (item: RecordListItem) => plantById(item.id);
  const hasRowActions = (plant: PlantResponse) => offersPlantRowActions(plant, forPlant(plant));
  const rowActionsLabel = (plant: PlantResponse) => `Más acciones para ${plant.name}`;
  // Over the whole list, not the page, so every page of it looks the same.
  const chevron = !filteredItems.some(hasRowActions);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, plant: PlantResponse) => {
    setMenuAnchor(event.currentTarget);
    setMenuPlantId(plant.id);
  };
  const handleMenuClose = () => setMenuAnchor(null);
  const menuPlant = plantById(menuPlantId);

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
            { label: "Producción", href: "/production" }
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={sxStyles.pageContainer}>
        <DetailHeader
          variant="list"
          icon={<SolarPowerIcon />}
          title="Producción"
          subtitle="Gestiona las plantas de producción de la comunidad energética"
          keyFacts={[
            { label: "Total plantas", value: stats.total },
            { label: "Potencia total", value: formatKilowatts(stats.totalPower) },
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
          {/* New Plant Button */}
          {createPlant && (
            <Button
              component={Link}
              to="/production/new"
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
              Nueva Planta
            </Button>
          )}

          {/* Search Bar */}
          {/* Named for what it matches (UI-PLS-002), not left on the supply list's default. */}
          <SearchBar value={searchText} onChange={changeSearch} placeholder="Buscar por nombre, CAU o dirección" />
          </Box>
        </Paper>
      </Box>

      <Box sx={sxStyles.pageContainerFull}>
        <ResponsiveRecordList
          // A failed read says so and offers the read again, never the empty state (UI-LST-004).
          error={error ? { message: "No se pudieron cargar las plantas.", onRetry: () => void refetch() } : undefined}
          empty={
            isLoading || error || filteredItems.length > 0 ? undefined : searchText ? (
              <EmptyState
                icon={SearchOffIcon}
                title="No hay plantas que coincidan"
                subtitle="Prueba con otra búsqueda."
                actionButton={{ label: "Limpiar filtros", onClick: () => changeSearch("") }}
              />
            ) : (
              <EmptyState
                icon={SolarPowerIcon}
                title="No se encontraron plantas"
                subtitle={
                  createPlant
                    ? "Comienza agregando tu primera planta de producción"
                    // A member cannot add one, so inviting them to is an
                    // instruction they can only fail to follow.
                    : "Todavía no hay ninguna planta de producción en esta comunidad."
                }
                actionButton={
                  createPlant
                    ? {
                        label: "Crear Planta",
                        onClick: () => navigate("/production/new"),
                        startIcon: <AddCircleOutlineIcon />,
                      }
                    : undefined
                }
              />
            )
          }
          wide={
            <ListTable
              rows={pageRows}
              getRowKey={(plant) => plant.id}
              isLoading={isLoading}
              rowActions={{ label: rowActionsLabel, onClick: handleMenuOpen, has: hasRowActions }}
              title={plantTableTitle}
              columns={plantTableColumns}
            />
          }
          narrow={
            <RecordList
              label="Plantas"
              isLoading={isLoading}
              chevron={chevron}
              rowActions={{
                label: (item) => {
                  const plant = plantOfItem(item);
                  return plant ? rowActionsLabel(plant) : `Más acciones para ${item.title}`;
                },
                onClick: (event, item) => {
                  const plant = plantOfItem(item);
                  if (plant) handleMenuOpen(event, plant);
                },
                has: (item) => {
                  const plant = plantOfItem(item);
                  return !!plant && hasRowActions(plant);
                },
              }}
              items={pageRows.map(toRecordListItem)}
            />
          }
          footer={
            !isLoading && (
              <ListPagination
                page={page}
                pageCount={pageCount}
                total={filteredItems.length}
                noun={{ one: "planta", other: "plantas" }}
                onChange={setPage}
              />
            )
          }
        />
      </Box>

      <PlantRowMenu
        anchorEl={menuAnchor}
        onClose={handleMenuClose}
        plant={menuPlant}
        actions={forPlant(menuPlant).actions}
        onDelete={() => menuPlant && setDeleteTargetId(menuPlant.id)}
      />

      <PlantDeletionDialog plant={plantById(deleteTargetId)} onClose={() => setDeleteTargetId(null)} />
    </Box>
  );
};
