import { useEffect, useMemo, useState, type FC } from "react";
import { Box, Button, Paper } from "@mui/material";
import { useGetAllPlants, useDeletePlant } from "../api/plants/plants";
import type { PlantResponse } from "../api/models";
import { BreadCrumb } from "../components/Breadcrumb";
import { SearchBar } from "../components/SearchBar/SearchBar";
import { PlantCard } from "../components/PlantCard/PlantCard";
import { PageHeaderWithStats } from "../components/PageHeader";
import { CardGrid } from "../components/CardGrid";
import { LoadingCardGrid } from "../components/CardGrid";
import { EmptyState } from "../components/EmptyState";
import { Link, useNavigate } from "react-router";
import { useErrorDispatch } from "../context/error.context";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SolarPowerIcon from "@mui/icons-material/SolarPower";

export const PlantsPage: FC = () => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const { data: { items: responseFromApi = [] } = {}, isLoading, error, refetch } = useGetAllPlants({ size: 10000 });
  const deletePlant = useDeletePlant();

  const deletePlantHandler = async (id: string) => {
    try {
      await deletePlant.mutateAsync({ id });
      refetch();
      return true;
    } catch (e) {
      errorDispatch("Ha habido un problema al eliminar la planta. Por favor inténtalo más tarde");
      return false;
    }
  };

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar las plantas. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  const filteredItems: PlantResponse[] = useMemo(() => {
    let items = responseFromApi;

    // Filter by search text
    if (searchText) {
      items = items.filter((item) =>
        item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.address?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return items;
  }, [searchText, responseFromApi]);

  const stats = useMemo(() => {
    const total = responseFromApi.length;
    const totalPower = responseFromApi.reduce((sum, item) => sum + (item.totalPower || 0), 0);
    return { total, totalPower: totalPower.toFixed(2) };
  }, [responseFromApi]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: "#f5f7fa",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" }
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <PageHeaderWithStats
          icon={SolarPowerIcon}
          title="Producción"
          subtitle="Gestiona las plantas de producción de la comunidad energética"
          stats={[
            { value: stats.total, label: "Total plantas" },
            { value: `${stats.totalPower} kW`, label: "Potencia total", color: "#10b981" },
          ]}
        />
      </Box>

      {/* Controls Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
          }}
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
          <Button
            component={Link}
            to="/production/new"
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            sx={{
              background: "#667eea",
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              py: 1.5,
              boxShadow: "0 4px 15px 0 rgba(102,126,234,0.4)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px 0 rgba(102,126,234,0.5)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Nueva Planta
          </Button>

          {/* Search Bar */}
          <SearchBar value={searchText} onChange={setSearchText} />
          </Box>
        </Paper>
      </Box>

      {/* Plant Cards Grid */}
      {!isLoading && !error && filteredItems.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <CardGrid
            items={filteredItems}
            getKey={(item) => item.id || ""}
            renderCard={(item) => (
              <PlantCard
                id={item.id}
                code={item.code}
                name={item.name}
                address={item.address}
                totalPower={item.totalPower}
                connectionDate={item.connectionDate}
                description={item.description}
                onDelete={deletePlantHandler}
              />
            )}
          />
        </Box>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <LoadingCardGrid />
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredItems.length === 0 && (
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <EmptyState
            icon={SolarPowerIcon}
            title="No se encontraron plantas"
            subtitle={
              searchText
                ? `No hay resultados para "${searchText}"`
                : "Comienza agregando tu primera planta de producción"
            }
            actionButton={
              !searchText
                ? {
                    label: "Crear Planta",
                    onClick: () => navigate("/production/new"),
                    startIcon: <AddCircleOutlineIcon />,
                  }
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
};
