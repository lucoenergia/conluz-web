import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { Box, Paper, Typography, Avatar, Chip } from "@mui/material";
import { useParams } from "react-router";
import { LoadingGraphCard } from "../components/Graph/LoadingGraphCard";
import { EnhancedGraph } from "../components/Graph";
import { EnhancedGraphCard } from "../components/Graph/EnhancedGraphCard";
import { EnhancedMultiSeriesBar } from "../components/Graph/EnhancedMultiSeriesBar";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { EnhancedStatsCard } from "../components/EnhancedStatsCard";
import { GraphFilter } from "../components/Graph/GraphFilter";
import { useGetSupply, useGetSupplyDailyProduction, useGetSupplyDailyConsumption } from "../api/supplies/supplies";
import { getTimeRange } from "../utils/getTimeRange";
import { useErrorDispatch } from "../context/error.context";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import PowerIcon from "@mui/icons-material/Power";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import EvStationIcon from "@mui/icons-material/EvStation";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PercentIcon from "@mui/icons-material/Percent";

export const SupplyDetailPage: FC = () => {
  const { supplyPointId = "" } = useParams();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const errorDispatch = useErrorDispatch();
  const timeRangeData: string = useMemo(() => {
    const difference = Math.abs(endDate.getTime() - startDate.getTime());
    const daysInRange = difference / (1000 * 60 * 60 * 24);

    // Check if this is a single month range (28-31 days) and both dates are in the same month
    if (daysInRange >= 27 && daysInRange <= 32 &&
        startDate.getDate() === 1 &&
        startDate.getMonth() !== endDate.getMonth()) {
      return "month";
    }

    return getTimeRange(startDate, endDate);
  }, [startDate, endDate]);

  const handleFilterChange = (startDate: Date, endDate: Date) => {
    setStartDate(startDate);
    setEndDate(endDate);
  };

  const { data: supplyPoint, isLoading: supplyPointLoading, error: supplyPointError } = useGetSupply(supplyPointId);

  // Fetch production data for specific supply using daily endpoint
  // This endpoint returns daily data for any date range (day, month, year)
  const {
    data: supplyProductionData,
    isLoading: supplyProductionIsLoading,
    error: supplyProductionError,
  } = useGetSupplyDailyProduction(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && (timeRangeData === "day" || timeRangeData === "month" || timeRangeData === "year") } },
  );

  // Fetch consumption data for specific supply
  // Always use daily consumption endpoint regardless of time range
  const {
    data: consumptionData,
    isLoading: consumptionIsLoading,
    error: consumptionError,
  } = useGetSupplyDailyConsumption(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && (timeRangeData === "day" || timeRangeData === "month" || timeRangeData === "year") } },
  );

  const isLoading = supplyProductionIsLoading || consumptionIsLoading || supplyPointLoading;
  const error = supplyProductionError || consumptionError || supplyPointError;

  useEffect(() => {
    if (error)
      errorDispatch(
        "Hay habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde",
      );
  }, [error]);

  // Process production data from the API response
  const data = useMemo(() => {
    if (!supplyProductionData) return [];
    return supplyProductionData.map((item) => item.power ?? 0);
  }, [supplyProductionData]);

  // Generate categories (x-axis labels) from production data
  const categories = useMemo(() => {
    if (!supplyProductionData || supplyProductionData.length === 0) return [];

    return supplyProductionData.map((item) => {
      const dateStr = item.time || "";
      if (!dateStr) return "";

      const date = new Date(dateStr);

      // For month view, show day number
      if (timeRangeData === "month") {
        return date.getDate().toString();
      }

      // For day view, show abbreviated month and day
      if (timeRangeData === "day") {
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleDateString("es-ES", { month: "short" });
        return `${day} ${month}`;
      }

      // For year view, show month name
      if (timeRangeData === "year") {
        return date.toLocaleDateString("es-ES", { month: "short" });
      }

      return "";
    });
  }, [supplyProductionData, timeRangeData]);

  // Process production data for chart
  const productionValues = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  // Calculate consumption metrics
  const consumptionMetrics = useMemo(() => {
    if (!consumptionData || consumptionData.length === 0) {
      return {
        totalConsumption: 0,
        totalSelfConsumption: 0,
        totalSurplus: 0,
        selfConsumptionPercentage: 0,
        utilizationPercentage: 0,
      };
    }

    const totalConsumption = consumptionData.reduce((sum, item) => sum + (item.consumptionKWh || 0), 0);
    const totalSelfConsumption = consumptionData.reduce((sum, item) => sum + (item.selfConsumptionEnergyKWh || 0), 0);
    const totalSurplus = consumptionData.reduce((sum, item) => sum + (item.surplusEnergyKWh || 0), 0);

    // Porcentaje de autoconsumo: SUM(selfConsumptionEnergyKWh) / (SUM(consumptionKWh) + SUM(surplusEnergyKWh))
    const denominator1 = totalConsumption + totalSurplus;
    const selfConsumptionPercentage = denominator1 > 0 ? (totalSelfConsumption / denominator1) * 100 : 0;

    // Porcentaje de aprovechamiento: SUM(selfConsumptionEnergyKWh) / (SUM(surplusEnergyKWh) + SUM(selfConsumptionEnergyKWh))
    const denominator2 = totalSurplus + totalSelfConsumption;
    const utilizationPercentage = denominator2 > 0 ? (totalSelfConsumption / denominator2) * 100 : 0;

    return {
      totalConsumption,
      totalSelfConsumption,
      totalSurplus,
      selfConsumptionPercentage,
      utilizationPercentage,
    };
  }, [consumptionData]);

  // Process consumption data for multi-series chart
  const { consumptionCategories, consumptionSeries } = useMemo(() => {
    if (!consumptionData || consumptionData.length === 0) {
      return { consumptionCategories: [], consumptionSeries: [] };
    }

    const cats = consumptionData.map((item) => {
      const dateStr = item.date || item.time || "";
      if (!dateStr) return "";

      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString("es-ES", { month: "short" });
      return `${day} ${month}`;
    });

    const seriesData = [
      {
        name: "Consumo Total",
        data: consumptionData.map((item) => item.consumptionKWh || 0),
        color: "#ef4444", // Red
      },
      {
        name: "Autoconsumo",
        data: consumptionData.map((item) => item.selfConsumptionEnergyKWh || 0),
        color: "#10b981", // Green
      },
      {
        name: "Excedentes",
        data: consumptionData.map((item) => item.surplusEnergyKWh || 0),
        color: "#f59e0b", // Amber
      },
    ];

    return {
      consumptionCategories: cats,
      consumptionSeries: seriesData,
    };
  }, [consumptionData]);

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
            { label: "Puntos de Suministro", href: "/supply-points" },
            { label: supplyPoint?.code ? supplyPoint?.code : supplyPointId, href: "#" },
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
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 3 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.2)",
              width: 56,
              height: 56,
            }}
          >
            <ElectricMeterIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                {supplyPoint?.name || "Punto de Suministro"}
              </Typography>
              {!supplyPointLoading && !supplyPointError && (
                <Chip
                  label={supplyPoint?.enabled ? "Activo" : "Inactivo"}
                  color={supplyPoint?.enabled ? "success" : "error"}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    color: "white",
                    backgroundColor: supplyPoint?.enabled ? "#10b981" : "#ef4444",
                  }}
                />
              )}
            </Box>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {supplyPoint?.address || "Dirección no disponible"}
            </Typography>
          </Box>
        </Box>

        {/* Supply Details Grid */}
        {!supplyPointLoading && !supplyPointError && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
                CUPS
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {supplyPoint?.code || "-"}
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
                Referencia catastral
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {supplyPoint?.addressRef || "-"}
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
                Coeficiente de reparto
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {supplyPoint?.partitionCoefficient ? `${(supplyPoint.partitionCoefficient * 100).toFixed(2)}%` : "-"}
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
                Propietario
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {supplyPoint?.user?.fullName || "-"}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Filter Section */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <GraphFilter handleChange={handleFilterChange} />
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          px: { xs: 2, sm: 0 },
          width: "100%",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <EnhancedStatsCard
          title="Consumo"
          subtitle="Consumo energético del punto de suministro"
          variant="consumption"
          icon={<PowerIcon sx={{ fontSize: 32 }} />}
          stats={[
            {
              label: "Consumo",
              value: `${consumptionMetrics.totalConsumption.toFixed(2)} kWh`,
              icon: <PowerIcon sx={{ fontSize: 24 }} />,
              color: "#ef4444",
            },
            {
              label: "Autoconsumo",
              value: `${consumptionMetrics.totalSelfConsumption.toFixed(2)} kWh`,
              icon: <BatteryChargingFullIcon sx={{ fontSize: 24 }} />,
              color: "#10b981",
            },
            {
              label: "Excedentes",
              value: `${consumptionMetrics.totalSurplus.toFixed(2)} kWh`,
              icon: <EvStationIcon sx={{ fontSize: 24 }} />,
              color: "#f59e0b",
            },
          ]}
        />

        <EnhancedStatsCard
          title="Eficiencia"
          subtitle="Indicadores de rendimiento energético"
          variant="production"
          icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
          stats={[
            {
              label: "Porcentaje de autoconsumo",
              value: `${consumptionMetrics.selfConsumptionPercentage.toFixed(2)}%`,
              icon: <PercentIcon sx={{ fontSize: 24 }} />,
              color: "#8b5cf6",
            },
            {
              label: "Porcentaje de aprovechamiento",
              value: `${consumptionMetrics.utilizationPercentage.toFixed(2)}%`,
              icon: <PercentIcon sx={{ fontSize: 24 }} />,
              color: "#3b82f6",
            },
          ]}
        />
      </Box>

      {/* Graphs Grid */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", boxSizing: "border-box" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
            },
            gap: { xs: 2, sm: 3 },
            width: "100%",
          }}
        >
          {!isLoading && !error && (
            <>
              {/* Production Chart */}
              <EnhancedGraph
                title="Producción Asignada"
                subtitle={`Rango: ${timeRangeData}`}
                values={productionValues}
                xAxis={categories}
                info="Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto"
                variant="production"
              />

              {/* Consumption Multi-Series Chart */}
              <EnhancedGraphCard
                title="Consumo Asignado"
                subtitle={`Rango: ${timeRangeData}`}
                infoText="Visualización del consumo total, autoconsumo y excedentes del punto de suministro"
                variant="consumption"
              >
                <EnhancedMultiSeriesBar
                  categories={consumptionCategories}
                  series={consumptionSeries}
                  variant="consumption"
                />
              </EnhancedGraphCard>
            </>
          )}
          {isLoading && Array.from({ length: 2 }).map((_, i) => <LoadingGraphCard key={i} />)}
        </Box>
      </Box>
    </Box>
  );
};
