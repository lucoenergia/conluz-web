import { useEffect, useMemo, useState, type FC } from "react";
import { useParams, useNavigate } from "react-router";
import { Box, Button, Typography, Paper, Skeleton, Fade, Grow, Chip, IconButton } from "@mui/material";
import { useDisableSupply, useEnableSupply } from "../api/supplies/supplies";
import { useGetSuppliesByUserId, useGetUserById } from "../api/users/users";
import type { SupplyResponse } from "../api/models";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { EnhancedSearchBar } from "../components/SearchBar/EnhancedSearchBar";
import { EnhancedSupplyCard } from "../components/SupplyCard/EnhancedSupplyCard";
import { Link } from "react-router";
import { useErrorDispatch } from "../context/error.context";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export const PartnerSupplyPointsPage: FC = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
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
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
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
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: 3 },
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate("/partners")} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <ElectricMeterIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Puntos de Suministro
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {isLoadingPartner ? "Cargando..." : `Socio: ${partner?.fullName || "Desconocido"}`}
            </Typography>
          </Box>
        </Box>

        {/* Statistics */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mt: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              {stats.total}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="h3" fontWeight="bold" sx={{ color: "#10b981" }}>
              {stats.active}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Activos
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="h3" fontWeight="bold" sx={{ color: "#ef4444" }}>
              {stats.inactive}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Inactivos
            </Typography>
          </Box>
        </Box>
      </Paper>

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
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: { xs: "center", sm: "flex-start" },
              }}
            >
              <FilterListIcon sx={{ color: "#64748b", display: { xs: "none", sm: "block" } }} />
              <Chip
                label="Todos"
                onClick={() => setFilterStatus("all")}
                color={filterStatus === "all" ? "primary" : "default"}
                size="small"
                sx={{
                  background: filterStatus === "all" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : undefined,
                }}
              />
              <Chip
                label="Activos"
                onClick={() => setFilterStatus("active")}
                color={filterStatus === "active" ? "success" : "default"}
                size="small"
              />
              <Chip
                label="Inactivos"
                onClick={() => setFilterStatus("inactive")}
                color={filterStatus === "inactive" ? "error" : "default"}
                size="small"
              />
            </Box>

            {/* Search Bar */}
            <EnhancedSearchBar value={searchText} onChange={setSearchText} />
          </Box>
        </Paper>
      </Box>

      {/* Supply Cards Grid */}
      {!isLoading && !error && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <Fade in timeout={500}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: { xs: 2, sm: 3 },
                width: "100%",
              }}
            >
              {filteredItems.map((item, index) => (
                <Grow in timeout={300 + index * 50} key={item.id}>
                  <Box>
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
                  </Box>
                </Grow>
              ))}
            </Box>
          </Fade>
        </Box>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr",
                md: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              gap: { xs: 2, sm: 3 },
              width: "100%",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Paper
                key={i}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
                }}
              >
                <Skeleton variant="rectangular" height={120} />
                <Box sx={{ p: 2 }}>
                  <Skeleton variant="text" sx={{ fontSize: "1.5rem" }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredItems.length === 0 && (
        <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 3,
              boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
              width: "100%",
            }}
          >
            <ElectricMeterIcon sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No se encontraron puntos de suministro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchText
                ? `No hay resultados para "${searchText}"`
                : "Este socio no tiene puntos de suministro asignados"}
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
};
