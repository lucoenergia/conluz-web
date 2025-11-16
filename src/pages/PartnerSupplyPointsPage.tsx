import { useEffect, useMemo, useState, type FC } from "react";
import { useParams } from "react-router";
import { Box, Paper } from "@mui/material";
import { useDisableSupply, useEnableSupply } from "../api/supplies/supplies";
import { useGetSuppliesByUserId, useGetUserById } from "../api/users/users";
import type { SupplyResponse } from "../api/models";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { EnhancedSearchBar } from "../components/SearchBar/EnhancedSearchBar";
import { EnhancedSupplyCard } from "../components/SupplyCard/EnhancedSupplyCard";
import { PageHeaderWithStats } from "../components/PageHeader";
import { FilterChipsBar, type FilterStatus } from "../components/FilterChips";
import { EnhancedCardGrid } from "../components/CardGrid";
import { LoadingCardGrid } from "../components/CardGrid";
import { EmptyState } from "../components/EmptyState";
import { useErrorDispatch } from "../context/error.context";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

export const PartnerSupplyPointsPage: FC = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const errorDispatch = useErrorDispatch();

  const { data: partner, isLoading: isLoadingPartner } = useGetUserById(partnerId || "", {
    query: { enabled: !!partnerId },
  });

  const {
    data: responseFromApi = [],
    isLoading,
    error,
    refetch,
  } = useGetSuppliesByUserId(partnerId || "", {
    query: { enabled: !!partnerId },
  });

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
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.address?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      items = items.filter((item) => (filterStatus === "active" ? item.enabled : !item.enabled));
    }

    return items;
  }, [searchText, responseFromApi, filterStatus]);

  const stats = useMemo(() => {
    const total = responseFromApi.length;
    const active = responseFromApi.filter((item) => item.enabled).length;
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
        <EnhancedBreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Socios", href: "/partners" },
            { label: partner?.fullName || "Socio", href: `/partners/${partnerId}/edit` },
            { label: "Puntos de Suministro", href: `/partners/${partnerId}/supply-points` },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={{ position: "relative" }}>
        <PageHeaderWithStats
          icon={ElectricMeterIcon}
          title="Puntos de Suministro"
          subtitle={isLoadingPartner ? "Cargando..." : `Socio: ${partner?.fullName || "Desconocido"}`}
          stats={[
            { value: stats.total, label: "Total" },
            { value: stats.active, label: "Activos", color: "#10b981" },
            { value: stats.inactive, label: "Inactivos", color: "#ef4444" },
          ]}
        />
      </Box>

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
            {/* Filter Chips */}
            <FilterChipsBar value={filterStatus} onChange={setFilterStatus} />

            {/* Search Bar */}
            <EnhancedSearchBar value={searchText} onChange={setSearchText} />
          </Box>
        </Paper>
      </Box>

      {/* Supply Cards Grid */}
      {!isLoading && !error && filteredItems.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <EnhancedCardGrid
            items={filteredItems}
            getKey={(item) => item.id || ""}
            renderCard={(item) => (
              <EnhancedSupplyCard
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
                : "Este socio no tiene puntos de suministro asignados"
            }
          />
        </Box>
      )}
    </Box>
  );
};
