import { useEffect, useMemo, useState, type FC } from "react";
import { Box, Button, Paper } from "@mui/material";
import { useDisableSupply, useEnableSupply, useGetAllSupplies } from "../api/supplies/supplies";
import type { SupplyResponse } from "../api/models";
import { BreadCrumb } from "../components/Breadcrumb";
import { SearchBar } from "../components/SearchBar/SearchBar";
import { SupplyCard } from "../components/SupplyCard/SupplyCard";
import { PageHeaderWithStats } from "../components/PageHeader";
import { FilterChipsBar, type FilterStatus } from "../components/FilterChips";
import { CardGrid } from "../components/CardGrid";
import { LoadingCardGrid } from "../components/CardGrid";
import { EmptyState } from "../components/EmptyState";
import { Link, useNavigate } from "react-router";
import { useErrorDispatch } from "../context/error.context";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

export const SupplyPointsPage: FC = () => {
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const { data: { items: responseFromApi = [] } = {}, isLoading, error, refetch } = useGetAllSupplies({ size: 10000 });
  const disableSupply = useDisableSupply();
  const enableSupply = useEnableSupply();

  const disableSupplyPoint = async (id: string) => {
    try {
      const response = await disableSupply.mutateAsync({ id });
      if (response) {
        refetch();
        return true;
      } else {
        errorDispatch("Ha habido un problema al deshabilitar el punto de suministro. Por favor inténtalo más tarde");
        return false;
      }
    } catch (e) {
      errorDispatch("Ha habido un problema al deshabilitar el punto de suministro. Por favor inténtalo más tarde");
      return false;
    }
  };

  const enableSupplyPoint = async (id: string) => {
    try {
      const response = await enableSupply.mutateAsync({ id });
      if (response) {
        refetch();
        return true;
      } else {
        errorDispatch("Ha habido un problema al habilitar el punto de suministro. Por favor inténtalo más tarde");
        return false;
      }
    } catch (e) {
      errorDispatch("Ha habido un problema al habilitar el punto de suministro. Por favor inténtalo más tarde");
      return false;
    }
  };

  useEffect(() => {
    if (error) {
      errorDispatch("Hay habido un problema al cargar los puntos de suministro. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  const filteredItems: SupplyResponse[] = useMemo(() => {
    let items = responseFromApi;

    // Filter by search text
    if (searchText) {
      items = items.filter((item) =>
        item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
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
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Puntos de Suministro", href: "/supply-points" }
          ]}
        />
      </Box>

      {/* Header Section */}
      <PageHeaderWithStats
        icon={ElectricMeterIcon}
        title="Puntos de Suministro"
        subtitle="Gestiona los puntos de suministro de la comunidad energética"
        stats={[
          { value: stats.total, label: "Total" },
          { value: stats.active, label: "Activos", color: "#10b981" },
          { value: stats.inactive, label: "Inactivos", color: "#ef4444" },
        ]}
      />

      {/* Controls Section */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            width: "100%",
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
          {/* New Supply Button */}
          <Button
            component={Link}
            to="/supply-points/new"
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
            Nuevo Punto de Suministro
          </Button>

          {/* Filter Chips */}
          <FilterChipsBar value={filterStatus} onChange={setFilterStatus} />

          {/* Search Bar */}
          <SearchBar value={searchText} onChange={setSearchText} />
          </Box>
        </Paper>
      </Box>

      {/* Supply Cards Grid */}
      {!isLoading && !error && filteredItems.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <CardGrid
            items={filteredItems}
            getKey={(item) => item.id}
            renderCard={(item) => (
              <SupplyCard
                id={item.id}
                code={item.code}
                partitionCoefficient={item.partitionCoefficient ? item.partitionCoefficient * 100 : undefined}
                name={item.name}
                address={item.address}
                enabled={item.enabled}
                lastConnection="Hace 2 horas"
                lastMeasurement={Math.floor(Math.random() * 100)}
                onDisable={disableSupplyPoint}
                onEnable={enableSupplyPoint}
              />
            )}
          />
        </Box>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <LoadingCardGrid />
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredItems.length === 0 && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <EmptyState
            icon={ElectricMeterIcon}
            title="No se encontraron puntos de suministro"
            subtitle={
              searchText
                ? `No hay resultados para "${searchText}"`
                : "Comienza agregando tu primer punto de suministro"
            }
            actionButton={
              !searchText
                ? {
                    label: "Crear Punto de Suministro",
                    onClick: () => navigate("/supply-points/new"),
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