import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { Box, Paper, Typography, Avatar, Chip } from "@mui/material";
import { useParams } from "react-router";
import { LoadingGraphCard } from "../components/Graph/LoadingGraphCard";
import { EnhancedGraph } from "../components/Graph";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { EnhancedStatsCard } from "../components/EnhancedStatsCard";
import { GraphFilter } from "../components/Graph/GraphFilter";
import {
  useGetDailyProduction,
  useGetHourlyProduction,
  useGetMonthlyProduction,
  useGetYearlyProduction,
} from "../api/production/production";
import { useGetSupply } from "../api/supplies/supplies";
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
  const timeRangeData: string = useMemo(() => getTimeRange(startDate, endDate), [startDate, endDate]);

  const handleFilterChange = (startDate: Date, endDate: Date) => {
    setStartDate(startDate);
    setEndDate(endDate);
  };

  const { data: supplyPoint, isLoading: supplyPointLoading, error: supplyPointError } = useGetSupply(supplyPointId);

  // Since, in react, hook methos can't be inside conditional structures like 'if's we have to put all four calls at the top level of the componet and control wether the request actually gets triggered with the enabled parameter
  const {
    data: hourlyData,
    isLoading: hourlyIsLoading,
    error: hourlyError,
  } = useGetHourlyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "hour" } },
  );
  const {
    data: dailyData,
    isLoading: dailyIsLoading,
    error: dailyError,
  } = useGetDailyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "day" } },
  );
  const {
    data: monthlyData,
    isLoading: monthlyIsLoading,
    error: montlyError,
  } = useGetMonthlyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "month" } },
  );
  const {
    data: yearlyData,
    isLoading: yearlyIsLoading,
    error: yearlyError,
  } = useGetYearlyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "year" } },
  );

  const isLoading = hourlyIsLoading || dailyIsLoading || monthlyIsLoading || yearlyIsLoading;
  const error = hourlyError || dailyError || montlyError || yearlyError;

  useEffect(() => {
    if (error)
      errorDispatch(
        "Hay habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde",
      );
  }, [error]);

  const data = useMemo(() => {
    switch (timeRangeData) {
      case "hour":
        return hourlyData as number[];
      case "day":
        return dailyData as number[];
      case "month":
        return monthlyData as number[];
      case "year":
        return yearlyData as number[];
    }
  }, [hourlyData, dailyData, monthlyData, yearlyData, timeRangeData]);

  // This is all for mocking the graph data until we can get actual data
  const categories =
    timeRangeData === "day"
      ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
      : timeRangeData === "month"
        ? ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        : ["2021", "2022", "2023", "2024", "2025"];

  const getMockedData = useCallback(() => {
    if (timeRangeData === "day") {
      return [30, 40, 45, 50, 49, 60, 70]; // mocked data para 7 días
    } else if (timeRangeData === "month") {
      return [30, 40, 45, 50, 49, 60, 70, 91, 35, 45, 55, 65]; //mocked data para 12 meses
    } else {
      return [30, 40, 45, 50, 49]; // mocked data para 5 años
    }
  }, [timeRangeData]);

  const measurementData = [
    {
      name: "Producción Asignada",
      value: [],
      info: "Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto",
      variant: "production" as const,
    },
    {
      name: "Consumo de red",
      value: [],
      info: "Cantidad de energía consumida de la red",
      variant: "consumption" as const,
    },
    {
      name: "Autoconsumo",
      value: [],
      info: "Cantidad de energía autoconsumida",
      variant: "production" as const,
    },
    {
      name: "Excedente",
      value: [],
      info: "Cantidad de energía no consumida",
      variant: "default" as const,
    },
  ];

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
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
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
              value: "0 kWh",
              icon: <PowerIcon sx={{ fontSize: 24 }} />,
              color: "#ef4444",
            },
            {
              label: "Autoconsumo",
              value: "0 kWh",
              icon: <BatteryChargingFullIcon sx={{ fontSize: 24 }} />,
              color: "#10b981",
            },
            {
              label: "Excedentes",
              value: "0 kWh",
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
              value: "0%",
              icon: <PercentIcon sx={{ fontSize: 24 }} />,
              color: "#8b5cf6",
            },
            {
              label: "Porcentaje de aprovechamiento",
              value: "0%",
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
          {!isLoading &&
            !error &&
            measurementData.map((item, index) => (
              <EnhancedGraph
                key={index}
                title={item.name}
                subtitle={`Rango: ${timeRangeData}`}
                values={data?.length ? data : getMockedData()}
                xAxis={categories}
                info={item.info}
                variant={item.variant}
              />
            ))}
          {isLoading && Array.from({ length: 4 }).map((_, i) => <LoadingGraphCard key={i} />)}
        </Box>
      </Box>
    </Box>
  );
};
