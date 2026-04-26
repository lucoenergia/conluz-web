import { useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import { LoadingGraphCard } from "../../components/Graph/LoadingGraphCard";
import { Graph } from "../../components/Graph";
import { BreadCrumb } from "../../components/Breadcrumb";
import { StatsCard } from "../../components/StatsCard";
import { GraphFilter } from "../../components/Graph/GraphFilter";
import { PlantDetailHeader } from "../../components/PlantDetailHeader";
import { useGetPlantById } from "../../api/plants/plants";
import { useGetDailyProduction, useGetHourlyProduction, useGetMonthlyProduction, useGetYearlyProduction } from "../../api/production/production";
import { getTimeRange } from "../../utils/getTimeRange";
import { useErrorDispatch } from "../../context/error.context";
import SolarPowerIcon from "@mui/icons-material/SolarPower";

export const PlantDetailPage: FC = () => {
  const { plantId = "" } = useParams();
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

  const { data: plant, isLoading: plantLoading, error: plantError } = useGetPlantById(plantId);

    // Fetch hourly production data when DAY filter is selected
  const {
    data: hourlyProductionData,
    isLoading: hourlyProductionIsLoading,
    error: hourlyProductionError,
  } = useGetHourlyProduction(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: filterType === "day" } },
  );

  // Fetch daily production data for month filter and dates filter with daily granularity
  const {
    data: dailyProductionData,
    isLoading: dailyProductionIsLoading,
    error: dailyProductionError,
  } = useGetDailyProduction(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString()},
    { query: { enabled: filterType === "month" || (filterType === "dates" && datesGranularity === "daily") } },
  );

  // Fetch monthly production data for year filter and dates filter with monthly granularity
  const {
    data: monthlyProductionData,
    isLoading: monthlyProductionIsLoading,
    error: monthlyProductionError,
  } = useGetMonthlyProduction(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: filterType === "year" || (filterType === "dates" && datesGranularity === "monthly") } },
  );

  // Fetch yearly production data for totals filter and dates filter with yearly granularity
  const {
    data: yearlyProductionData,
    isLoading: yearlyProductionIsLoading,
    error: yearlyProductionError,
  } = useGetYearlyProduction(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: filterType === "totals" || (filterType === "dates" && datesGranularity === "yearly") } },
  );

  // Fetch previous period hourly production data when DAY filter is selected
  const {
    data: prevHourlyProductionData,
  } = useGetHourlyProduction(
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
    { query: { enabled: filterType === "day" } },
  );

  // Fetch previous period daily production data for month filter and dates filter with daily granularity
  const {
    data: prevDailyProductionData,
  } = useGetDailyProduction(
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString()},
    { query: { enabled: filterType === "month" || (filterType === "dates" && datesGranularity === "daily") } },
  );

  // Fetch previous period monthly production data
  const {
    data: prevMonthlyProductionData,
  } = useGetMonthlyProduction(
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
    { query: { enabled: filterType === "year" || (filterType === "dates" && datesGranularity === "monthly") } },
  );

  // No meaningful previous period for totals (multi-year range)
  const {
    data: prevYearlyProductionData,
  } = useGetYearlyProduction(
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
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

      const date = new Date(dateStr);

      if (filterType === "day") {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      if (filterType === "month") {
        return date.getDate().toString();
      }

      // monthly data → show month name
      if (filterType === "year") {
        return date.toLocaleDateString("es-ES", { month: "short" });
      }

      // yearly data → show year number
      if (filterType === "totals") {
        return date.getFullYear().toString();
      }

      if (filterType === "dates") {
        if (datesGranularity === "monthly") {
          return date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
        }
        if (datesGranularity === "yearly") {
          return date.getFullYear().toString();
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleDateString("es-ES", { month: "short" });
        return `${day} ${month}`;
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString("es-ES", { month: "short" });
      return `${day} ${month}`;
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
            { label: "Producción", href: "/production" },
            { label: plant?.code ? plant?.code : plantId, href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <PlantDetailHeader
          plant={plant}
          isLoading={plantLoading}
          error={plantError}
        />
      </Box>

      {/* Filter Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <GraphFilter handleChange={handleFilterChange} />
      </Box>

      {/* Stats Card */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <StatsCard
          title="Producción"
          subtitle="Producción energética de la planta"
          variant="production"
          icon={<SolarPowerIcon sx={{ fontSize: 32 }} />}
          stats={[
            {
              label: "Producción total",
              value: `${productionMetrics.totalProduction.toFixed(2)} kWh`,
              trend: productionMetrics.productionTrend !== undefined ? Math.round(productionMetrics.productionTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <SolarPowerIcon sx={{ fontSize: 24 }} />,
              color: "#667eea",
            },
          ]}
        />
      </Box>

      {/* Production Graph */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
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
              borderRadius: 3,
              boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            }}
          >
            <SolarPowerIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 2 }} />
            <Box sx={{ typography: "h6", color: "text.secondary" }}>
              No hay datos de producción para el período seleccionado
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
