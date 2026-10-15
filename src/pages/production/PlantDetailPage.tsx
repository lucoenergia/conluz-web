import { radii, shadows, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import { LoadingGraphCard } from "../../components/Graph/LoadingGraphCard";
import { Graph } from "../../components/Graph";
import { BreadCrumb } from "../../components/Breadcrumb";
import { StatsCard } from "../../components/StatsCard";
import { GraphFilter } from "../../components/Graph/GraphFilter";
import { PlantDetailHeader } from "../../components/PlantDetailHeader";
import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import { useGetDailyProduction, useGetHourlyProduction, useGetMonthlyProduction, useGetYearlyProduction } from "../../api/production/production";
import { getTimeRange } from "../../utils/getTimeRange";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { formatCalendarDate, formatTimeOfDay } from "../../utils/formatCalendarDate";
import { useErrorDispatch } from "../../context/error.context";
import { useActiveCommunity } from "../../context/community.context";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { EmptyState } from "../../components/EmptyState";
import { PlantIntegrationsSection } from "./PlantIntegrationsSection";

export const PlantDetailPage: FC = () => {
  const { plantId = "" } = useParams();
  const activeCommunityId = useActiveCommunity();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const errorDispatch = useErrorDispatch();

  // Detect which filter button was clicked based on date patterns
  const filterType = useMemo(() => {
    const difference = Math.abs(endDate.getTime() - startDate.getTime());
    const daysInRange = difference / (1000 * 60 * 60 * 24);

    // DAY: same day (start and end are within the same calendar day)
    if (daysInRange < 1.5) {
      return "day";
    }

    // MONTH: spans 27-32 days and starts at day 1
    if (daysInRange >= 27 && daysInRange <= 32 &&
        startDate.getDate() === 1 &&
        startDate.getMonth() !== endDate.getMonth()) {
      return "month";
    }

    // YEAR: spans 300-730 days
    if (daysInRange >= 300 && daysInRange <= 730) {
      return "year";
    }

    // TOTALS: spans more than 730 days (multi-year range)
    if (daysInRange > 730) {
      return "totals";
    }

    // DATES: custom range
    return "dates";
  }, [startDate, endDate]);

  // For "dates" filter, determine granularity based on range size
  const datesGranularity = useMemo(() => {
    if (filterType !== "dates") return null;
    const days = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 60) return "daily";
    if (days <= 730) return "monthly";
    return "yearly";
  }, [filterType, startDate, endDate]);

  // Calculate time range for display and x-axis formatting
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

  // Calculate previous period dates for trend comparison
  const { prevStartDate, prevEndDate } = useMemo(() => {
    const difference = Math.abs(endDate.getTime() - startDate.getTime());

    const prevEnd = new Date(startDate);
    prevEnd.setMilliseconds(-1); // End of previous period is 1ms before current start

    const prevStart = new Date(prevEnd);
    prevStart.setTime(prevStart.getTime() - difference); // Same duration as current period

    return {
      prevStartDate: prevStart,
      prevEndDate: prevEnd,
    };
  }, [startDate, endDate]);

  const { plant, isLoading: plantLoading, isNotFound: isPlantNotFound, error: plantError } =
    usePlantInActiveCommunity(plantId);

  // The community endpoints filtered by the plant's supply: a supply backs at
  // most one plant, so this is the plant's own production (UI-PLT-001). Nothing
  // is requested before the plant is known, or the first answer would be the
  // whole community's.
  const supplyId = plant?.supply.id;
  const canQueryProduction = !!activeCommunityId && !!supplyId;

    // Fetch hourly production data when DAY filter is selected
  const {
    data: hourlyProductionData,
    isLoading: hourlyProductionIsLoading,
    error: hourlyProductionError,
  } = useGetHourlyProduction(
    activeCommunityId ?? "",
    { startDate: startDate.toISOString(), endDate: endDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && filterType === "day" } },
  );

  // Fetch daily production data for month filter and dates filter with daily granularity
  const {
    data: dailyProductionData,
    isLoading: dailyProductionIsLoading,
    error: dailyProductionError,
  } = useGetDailyProduction(
    activeCommunityId ?? "",
    { startDate: startDate.toISOString(), endDate: endDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && (filterType === "month" || (filterType === "dates" && datesGranularity === "daily")) } },
  );

  // Fetch monthly production data for year filter and dates filter with monthly granularity
  const {
    data: monthlyProductionData,
    isLoading: monthlyProductionIsLoading,
    error: monthlyProductionError,
  } = useGetMonthlyProduction(
    activeCommunityId ?? "",
    { startDate: startDate.toISOString(), endDate: endDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && (filterType === "year" || (filterType === "dates" && datesGranularity === "monthly")) } },
  );

  // Fetch yearly production data for totals filter and dates filter with yearly granularity
  const {
    data: yearlyProductionData,
    isLoading: yearlyProductionIsLoading,
    error: yearlyProductionError,
  } = useGetYearlyProduction(
    activeCommunityId ?? "",
    { startDate: startDate.toISOString(), endDate: endDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && (filterType === "totals" || (filterType === "dates" && datesGranularity === "yearly")) } },
  );

  // Fetch previous period hourly production data when DAY filter is selected
  const {
    data: prevHourlyProductionData,
  } = useGetHourlyProduction(
    activeCommunityId ?? "",
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && filterType === "day" } },
  );

  // Fetch previous period daily production data for month filter and dates filter with daily granularity
  const {
    data: prevDailyProductionData,
  } = useGetDailyProduction(
    activeCommunityId ?? "",
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && (filterType === "month" || (filterType === "dates" && datesGranularity === "daily")) } },
  );

  // Fetch previous period monthly production data
  const {
    data: prevMonthlyProductionData,
  } = useGetMonthlyProduction(
    activeCommunityId ?? "",
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString(), supplyId },
    { query: { enabled: canQueryProduction && (filterType === "year" || (filterType === "dates" && datesGranularity === "monthly")) } },
  );

  // No meaningful previous period for totals (multi-year range)
  const {
    data: prevYearlyProductionData,
  } = useGetYearlyProduction(
    activeCommunityId ?? "",
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString(), supplyId },
    { query: { enabled: false } },
  );

  // Unified data sources - select endpoint based on filterType and datesGranularity
  const productionData =
    filterType === "day" ? hourlyProductionData
    : filterType === "year" || (filterType === "dates" && datesGranularity === "monthly") ? monthlyProductionData
    : filterType === "totals" || (filterType === "dates" && datesGranularity === "yearly") ? yearlyProductionData
    : dailyProductionData;

  const prevProductionData =
    filterType === "day" ? prevHourlyProductionData
    : filterType === "year" || (filterType === "dates" && datesGranularity === "monthly") ? prevMonthlyProductionData
    : filterType === "totals" || (filterType === "dates" && datesGranularity === "yearly") ? prevYearlyProductionData
    : prevDailyProductionData;

  // Unified loading and error states
  const isLoading =
    hourlyProductionIsLoading ||
    dailyProductionIsLoading ||
    monthlyProductionIsLoading ||
    yearlyProductionIsLoading ||
    plantLoading;

  const error =
    hourlyProductionError ||
    dailyProductionError ||
    monthlyProductionError ||
    yearlyProductionError ||
    plantError;

  useEffect(() => {
    if (error)
      errorDispatch(
        "Ha habido un problema al cargar la información de esta planta. Por favor, inténtalo más tarde",
      );
  }, [error, errorDispatch]);

  // Process production data from the API response
  const data = useMemo(() => {
    if (!productionData) return [];
    return productionData.map((item) => item.power ?? 0);
  }, [productionData]);

  // Generate categories (x-axis labels) from production data
  const categories = useMemo(() => {
    if (!productionData || productionData.length === 0) return [];

    return productionData.map((item) => {
      const dateStr = item.time || "";
      if (!dateStr) return "";

      // Instants, labelled in the app's time zone, never the device's (#255).
      if (filterType === "day") {
        return formatTimeOfDay(dateStr);
      }

      if (filterType === "month") {
        return formatCalendarDate(dateStr, { day: "numeric", month: undefined, year: undefined });
      }

      // monthly data → show month name
      if (filterType === "year") {
        return formatCalendarDate(dateStr, { day: undefined, month: "short", year: undefined });
      }

      // yearly data → show year number
      if (filterType === "totals") {
        return formatCalendarDate(dateStr, { day: undefined, month: undefined, year: "numeric" });
      }

      if (filterType === "dates") {
        if (datesGranularity === "monthly") {
          return formatCalendarDate(dateStr, { day: undefined, month: "short", year: "2-digit" });
        }
        if (datesGranularity === "yearly") {
          return formatCalendarDate(dateStr, { day: undefined, month: undefined, year: "numeric" });
        }
      }

      return formatCalendarDate(dateStr, { day: "2-digit", month: "short", year: undefined });
    });
  }, [productionData, filterType, datesGranularity]);

  // Process production data for chart
  const productionValues = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  // Calculate production metrics with trends
  const productionMetrics = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      return {
        totalProduction: 0,
        productionTrend: undefined,
      };
    }

    const totalProduction = productionData.reduce((sum, item) => sum + (item.power || 0), 0);

    // Calculate trend compared to previous period
    let productionTrend: number | undefined = undefined;

    if (prevProductionData && prevProductionData.length > 0) {
      const prevTotalProduction = prevProductionData.reduce((sum, item) => sum + (item.power || 0), 0);

      // Calculate trend as percentage change
      if (prevTotalProduction > 0) {
        productionTrend = ((totalProduction - prevTotalProduction) / prevTotalProduction) * 100;
      } else if (totalProduction > 0) {
        // If previous was 0 but current is positive, show as 100% increase
        productionTrend = 100;
      }
    }

    return {
      totalProduction,
      productionTrend,
    };
  }, [productionData, prevProductionData]);

  // A plant outside the active community is withheld, so its supply is never
  // requested against the active community's production either.
  if (isPlantNotFound) {
    return (
      <Box sx={sxStyles.pageContainer}>
        <EmptyState
          icon={SearchOffIcon}
          title="Planta no encontrada"
          subtitle="Esta planta no existe o no tienes acceso a su comunidad."
        />
      </Box>
    );
  }

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
            { label: "Producción", href: "/production" },
            { label: plant?.name || plantId, href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={sxStyles.pageContainer}>
        <PlantDetailHeader
          plant={plant}
          isLoading={plantLoading}
          error={plantError}
        />
      </Box>

      {/* Filter Section */}
      <Box sx={sxStyles.pageContainer}>
        <GraphFilter handleChange={handleFilterChange} />
      </Box>

      {/* Stats Card */}
      <Box sx={sxStyles.pageContainer}>
        <StatsCard
          title="Producción"
          subtitle="Producción energética de la planta"
          variant="production"
          icon={<SolarPowerIcon sx={{ fontSize: 32 }} />}
          stats={[
            {
              label: "Producción total",
              value: formatKilowattHours(productionMetrics.totalProduction),
              trend: productionMetrics.productionTrend !== undefined ? Math.round(productionMetrics.productionTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <SolarPowerIcon sx={{ fontSize: 24 }} />,
              color: "primary.main",
            },
          ]}
        />
      </Box>

      {/* Production Graph */}
      <Box sx={sxStyles.pageContainer}>
        {!isLoading && !error && productionValues.length > 0 && (
          <Graph
            title="Producción"
            subtitle={`Rango: ${timeRangeData}`}
            values={productionValues}
            xAxis={categories}
            info="Producción energética de la planta durante el período seleccionado"
            variant="production"
          />
        )}
        {isLoading && <LoadingGraphCard />}
        {!isLoading && !error && productionValues.length === 0 && (
          <Box
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: "white",
              borderRadius: radii.large,
              boxShadow: shadows.soft,
            }}
          >
            {/* eslint-disable-next-line no-restricted-syntax -- empty-state icon muted blue (#cbd5e1); no matching token */}
            <SolarPowerIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 2 }} />
            <Box sx={{ typography: "h6", color: "text.secondary" }}>
              No hay datos de producción para el período seleccionado
            </Box>
          </Box>
        )}
      </Box>

      {/* Integrations: only for a caller who may manage this plant. No wrapper:
          a caller without canManage must not get an empty box and its gap. */}
      <PlantIntegrationsSection plant={plant} />
    </Box>
  );
};
