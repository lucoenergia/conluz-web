import { useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import { LoadingGraphCard } from "../../components/Graph/LoadingGraphCard";
import { Graph } from "../../components/Graph";
import { GraphCard } from "../../components/Graph/GraphCard";
import { MultiSeriesBar } from "../../components/Graph/MultiSeriesBar";
import { BreadCrumb } from "../../components/Breadcrumb";
import { StatsCard } from "../../components/StatsCard";
import { GraphFilter } from "../../components/Graph/GraphFilter";
import { SupplyDetailHeader } from "../../components/SupplyDetailHeader";
import { useGetSupply, useGetSupplyDailyProduction, useGetSupplyDailyConsumption, useGetSupplyHourlyProduction, useGetSupplyHourlyConsumption, useGetSupplyMonthlyConsumption, useGetSupplyYearlyConsumption, useGetSupplyMonthlyProduction } from "../../api/supplies/supplies";
import { getTimeRange } from "../../utils/getTimeRange";
import { useErrorDispatch } from "../../context/error.context";
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

    // YEAR: spans a calendar year (300–730 days)
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

  const { data: supplyPoint, isLoading: supplyPointLoading, error: supplyPointError } = useGetSupply(supplyPointId);

  // Fetch hourly production data when DAY filter is selected
  const {
    data: supplyHourlyProductionData,
    isLoading: supplyHourlyProductionIsLoading,
    error: supplyHourlyProductionError,
  } = useGetSupplyHourlyProduction(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && filterType === "day" } },
  );

  // Fetch daily production data for month filter and dates filter with daily granularity
  const {
    data: supplyDailyProductionData,
    isLoading: supplyDailyProductionIsLoading,
    error: supplyDailyProductionError,
  } = useGetSupplyDailyProduction(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && (filterType === "month" || (filterType === "dates" && datesGranularity === "daily")) } },
  );

  // Fetch monthly production data for year filter and dates filter with monthly/yearly granularity
  const {
    data: supplyMonthlyProductionData,
    isLoading: supplyMonthlyProductionIsLoading,
    error: supplyMonthlyProductionError,
  } = useGetSupplyMonthlyProduction(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && (filterType === "year" || filterType === "totals" || (filterType === "dates" && datesGranularity !== "daily")) } },
  );

  // Fetch hourly consumption data when DAY filter is selected
  const {
    data: hourlyConsumptionData,
    isLoading: hourlyConsumptionIsLoading,
    error: hourlyConsumptionError,
  } = useGetSupplyHourlyConsumption(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && filterType === "day" } },
  );

  // Fetch daily consumption data for month filter and dates filter with daily granularity
  const {
    data: dailyConsumptionData,
    isLoading: dailyConsumptionIsLoading,
    error: dailyConsumptionError,
  } = useGetSupplyDailyConsumption(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && (filterType === "month" || (filterType === "dates" && datesGranularity === "daily")) } },
  );

  // Fetch monthly consumption data for year filter and dates filter with monthly granularity
  const {
    data: monthlyConsumptionData,
    isLoading: monthlyConsumptionIsLoading,
    error: monthlyConsumptionError,
  } = useGetSupplyMonthlyConsumption(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && (filterType === "year" || (filterType === "dates" && datesGranularity === "monthly")) } },
  );

  // Fetch yearly consumption data for totals filter
  const {
    data: yearlyConsumptionData,
    isLoading: yearlyConsumptionIsLoading,
    error: yearlyConsumptionError,
  } = useGetSupplyYearlyConsumption(
    supplyPointId,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: !!supplyPointId && filterType === "totals" } },
  );

  // Fetch previous period hourly consumption data when DAY filter is selected
  const {
    data: prevHourlyConsumptionData,
  } = useGetSupplyHourlyConsumption(
    supplyPointId,
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
    { query: { enabled: !!supplyPointId && filterType === "day" } },
  );

  // Fetch previous period daily consumption data for month filter and dates filter with daily granularity
  const {
    data: prevDailyConsumptionData,
  } = useGetSupplyDailyConsumption(
    supplyPointId,
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
    { query: { enabled: !!supplyPointId && (filterType === "month" || (filterType === "dates" && datesGranularity === "daily")) } },
  );

  // Fetch previous period monthly consumption data for year filter and dates filter with monthly granularity
  const {
    data: prevMonthlyConsumptionData,
  } = useGetSupplyMonthlyConsumption(
    supplyPointId,
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
    { query: { enabled: !!supplyPointId && (filterType === "year" || (filterType === "dates" && datesGranularity === "monthly")) } },
  );

  // No previous period for totals (subtracting 25+ years yields meaningless dates)
  const {
    data: prevYearlyConsumptionData,
  } = useGetSupplyYearlyConsumption(
    supplyPointId,
    { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() },
    { query: { enabled: false } },
  );

  // Unified data sources - select endpoint based on filterType and datesGranularity
  const supplyProductionData =
    filterType === "day" ? supplyHourlyProductionData
    : filterType === "year" || filterType === "totals" || (filterType === "dates" && datesGranularity !== "daily") ? supplyMonthlyProductionData
    : supplyDailyProductionData;

  const consumptionData =
    filterType === "day" ? hourlyConsumptionData
    : filterType === "totals" ? yearlyConsumptionData
    : filterType === "year" || (filterType === "dates" && datesGranularity === "monthly") ? monthlyConsumptionData
    : filterType === "dates" && datesGranularity === "yearly" ? yearlyConsumptionData
    : dailyConsumptionData;

  const prevConsumptionData =
    filterType === "day" ? prevHourlyConsumptionData
    : filterType === "totals" ? prevYearlyConsumptionData
    : filterType === "year" || (filterType === "dates" && datesGranularity === "monthly") ? prevMonthlyConsumptionData
    : filterType === "dates" && datesGranularity === "yearly" ? prevYearlyConsumptionData
    : prevDailyConsumptionData;

  // Unified loading and error states
  const isLoading =
    supplyHourlyProductionIsLoading ||
    supplyDailyProductionIsLoading ||
    supplyMonthlyProductionIsLoading ||
    hourlyConsumptionIsLoading ||
    dailyConsumptionIsLoading ||
    monthlyConsumptionIsLoading ||
    yearlyConsumptionIsLoading ||
    supplyPointLoading;

  const error =
    supplyHourlyProductionError ||
    supplyDailyProductionError ||
    supplyMonthlyProductionError ||
    hourlyConsumptionError ||
    dailyConsumptionError ||
    monthlyConsumptionError ||
    yearlyConsumptionError ||
    supplyPointError;

  useEffect(() => {
    if (error)
      errorDispatch(
        "Hay habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde",
      );
  }, [error]);

  // Aggregate monthly production data into yearly buckets for the totals filter
  const yearlyProductionData = useMemo(() => {
    if (filterType !== "totals" || !supplyMonthlyProductionData) return null;
    const yearMap = new Map<number, number>();
    supplyMonthlyProductionData.forEach((item) => {
      if (!item.time) return;
      const year = new Date(item.time).getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + (item.power ?? 0));
    });
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);
    return sortedYears.map((year) => ({ year, power: yearMap.get(year) || 0 }));
  }, [filterType, supplyMonthlyProductionData]);

  // Process production data from the API response
  const data = useMemo(() => {
    if (filterType === "totals") {
      return yearlyProductionData ? yearlyProductionData.map((item) => item.power) : [];
    }
    if (!supplyProductionData) return [];
    return supplyProductionData.map((item) => item.power ?? 0);
  }, [supplyProductionData, yearlyProductionData, filterType]);

  // Generate categories (x-axis labels) from production data
  const categories = useMemo(() => {
    if (filterType === "totals") {
      return yearlyProductionData ? yearlyProductionData.map((item) => item.year.toString()) : [];
    }

    if (!supplyProductionData || supplyProductionData.length === 0) return [];

    return supplyProductionData.map((item) => {
      const dateStr = item.time || "";
      if (!dateStr) return "";

      const date = new Date(dateStr);

      // For day filter with hourly data, show hour in HH:mm format
      if (filterType === "day") {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      // For month filter, show day number
      if (filterType === "month") {
        return date.getDate().toString();
      }

      // For year filter, show month name
      if (filterType === "year") {
        return date.toLocaleDateString("es-ES", { month: "short" });
      }

      // For custom dates, show day and month
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString("es-ES", { month: "short" });
      return `${day} ${month}`;
    });
  }, [supplyProductionData, yearlyProductionData, filterType]);

  // Process production data for chart
  const productionValues = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  // Calculate consumption metrics with trends
  const consumptionMetrics = useMemo(() => {
    if (!consumptionData || consumptionData.length === 0) {
      return {
        totalConsumption: 0,
        totalSelfConsumption: 0,
        totalSurplus: 0,
        selfConsumptionPercentage: 0,
        utilizationPercentage: 0,
        consumptionTrend: undefined,
        selfConsumptionTrend: undefined,
        surplusTrend: undefined,
        selfConsumptionPercentageTrend: undefined,
        utilizationPercentageTrend: undefined,
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

    // Calculate trends compared to previous period
    let consumptionTrend: number | undefined = undefined;
    let selfConsumptionTrend: number | undefined = undefined;
    let surplusTrend: number | undefined = undefined;
    let selfConsumptionPercentageTrend: number | undefined = undefined;
    let utilizationPercentageTrend: number | undefined = undefined;

    if (prevConsumptionData && prevConsumptionData.length > 0) {
      const prevTotalConsumption = prevConsumptionData.reduce((sum, item) => sum + (item.consumptionKWh || 0), 0);
      const prevTotalSelfConsumption = prevConsumptionData.reduce((sum, item) => sum + (item.selfConsumptionEnergyKWh || 0), 0);
      const prevTotalSurplus = prevConsumptionData.reduce((sum, item) => sum + (item.surplusEnergyKWh || 0), 0);

      // Calculate previous percentages
      const prevDenominator1 = prevTotalConsumption + prevTotalSurplus;
      const prevSelfConsumptionPercentage = prevDenominator1 > 0 ? (prevTotalSelfConsumption / prevDenominator1) * 100 : 0;

      const prevDenominator2 = prevTotalSurplus + prevTotalSelfConsumption;
      const prevUtilizationPercentage = prevDenominator2 > 0 ? (prevTotalSelfConsumption / prevDenominator2) * 100 : 0;

      // Calculate trends as percentage change
      // Only calculate if previous value exists (even if 0)
      if (prevTotalConsumption > 0) {
        consumptionTrend = ((totalConsumption - prevTotalConsumption) / prevTotalConsumption) * 100;
      } else if (totalConsumption > 0) {
        // If previous was 0 but current is positive, show as 100% increase
        consumptionTrend = 100;
      }

      if (prevTotalSelfConsumption > 0) {
        selfConsumptionTrend = ((totalSelfConsumption - prevTotalSelfConsumption) / prevTotalSelfConsumption) * 100;
      } else if (totalSelfConsumption > 0) {
        selfConsumptionTrend = 100;
      }

      if (prevTotalSurplus > 0) {
        surplusTrend = ((totalSurplus - prevTotalSurplus) / prevTotalSurplus) * 100;
      } else if (totalSurplus > 0) {
        surplusTrend = 100;
      }

      if (prevSelfConsumptionPercentage > 0) {
        selfConsumptionPercentageTrend = ((selfConsumptionPercentage - prevSelfConsumptionPercentage) / prevSelfConsumptionPercentage) * 100;
      } else if (selfConsumptionPercentage > 0) {
        selfConsumptionPercentageTrend = 100;
      }

      if (prevUtilizationPercentage > 0) {
        utilizationPercentageTrend = ((utilizationPercentage - prevUtilizationPercentage) / prevUtilizationPercentage) * 100;
      } else if (utilizationPercentage > 0) {
        utilizationPercentageTrend = 100;
      }
    }

    return {
      totalConsumption,
      totalSelfConsumption,
      totalSurplus,
      selfConsumptionPercentage,
      utilizationPercentage,
      consumptionTrend,
      selfConsumptionTrend,
      surplusTrend,
      selfConsumptionPercentageTrend,
      utilizationPercentageTrend,
    };
  }, [consumptionData, prevConsumptionData]);

  // Process consumption data for multi-series chart
  const { consumptionCategories, consumptionSeries } = useMemo(() => {
    if (!consumptionData || consumptionData.length === 0) {
      return { consumptionCategories: [], consumptionSeries: [] };
    }

    const cats = consumptionData.map((item) => {
      const dateStr = item.date || item.time || "";
      if (!dateStr) return "";

      const date = new Date(dateStr);

      // For day filter with hourly data, show hour in HH:mm format
      if (filterType === "day") {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      // For month filter, show day number
      if (filterType === "month") {
        return date.getDate().toString();
      }

      // For year filter, show month name
      if (filterType === "year") {
        return date.toLocaleDateString("es-ES", { month: "short" });
      }

      // For totals filter, show year
      if (filterType === "totals") {
        return date.getFullYear().toString();
      }

      // For custom dates, show day and month
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString("es-ES", { month: "short" });
      return `${day} ${month}`;
    });

    const seriesData = [
      {
        name: "Consumo de Red",
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
  }, [consumptionData, filterType]);

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
            { label: "Puntos de Suministro", href: "/supply-points" },
            { label: supplyPoint?.code ? supplyPoint?.code : supplyPointId, href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <SupplyDetailHeader
          supplyPoint={supplyPoint}
          isLoading={supplyPointLoading}
          error={supplyPointError}
        />
      </Box>

      {/* Filter Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <GraphFilter handleChange={handleFilterChange} />
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          px: { xs: 2, sm: 0 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <StatsCard
          title="Consumo"
          subtitle="Consumo energético del punto de suministro"
          variant="consumption"
          icon={<PowerIcon sx={{ fontSize: 32 }} />}
          stats={[
            {
              label: "Consumo",
              value: `${consumptionMetrics.totalConsumption.toFixed(2)} kWh`,
              trend: consumptionMetrics.consumptionTrend !== undefined ? Math.round(consumptionMetrics.consumptionTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <PowerIcon sx={{ fontSize: 24 }} />,
              color: "#ef4444",
            },
            {
              label: "Autoconsumo",
              value: `${consumptionMetrics.totalSelfConsumption.toFixed(2)} kWh`,
              trend: consumptionMetrics.selfConsumptionTrend !== undefined ? Math.round(consumptionMetrics.selfConsumptionTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <BatteryChargingFullIcon sx={{ fontSize: 24 }} />,
              color: "#10b981",
            },
            {
              label: "Excedentes",
              value: `${consumptionMetrics.totalSurplus.toFixed(2)} kWh`,
              trend: consumptionMetrics.surplusTrend !== undefined ? Math.round(consumptionMetrics.surplusTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <EvStationIcon sx={{ fontSize: 24 }} />,
              color: "#f59e0b",
            },
          ]}
        />

        <StatsCard
          title="Eficiencia"
          subtitle="Indicadores de rendimiento energético"
          variant="production"
          icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
          stats={[
            {
              label: "Porcentaje de autoconsumo",
              value: `${consumptionMetrics.selfConsumptionPercentage.toFixed(2)}%`,
              trend: consumptionMetrics.selfConsumptionPercentageTrend !== undefined ? Math.round(consumptionMetrics.selfConsumptionPercentageTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <PercentIcon sx={{ fontSize: 24 }} />,
              color: "#8b5cf6",
            },
            {
              label: "Porcentaje de aprovechamiento",
              value: `${consumptionMetrics.utilizationPercentage.toFixed(2)}%`,
              trend: consumptionMetrics.utilizationPercentageTrend !== undefined ? Math.round(consumptionMetrics.utilizationPercentageTrend) : undefined,
              trendLabel: "vs período anterior",
              icon: <PercentIcon sx={{ fontSize: 24 }} />,
              color: "#3b82f6",
            },
          ]}
        />
      </Box>

      {/* Graphs Grid */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
            },
            gap: { xs: 2, sm: 3 },
          }}
        >
          {!isLoading && !error && (
            <>
              {/* Production Chart */}
              <Graph
                title="Producción Asignada"
                subtitle={`Rango: ${timeRangeData}`}
                values={productionValues}
                xAxis={categories}
                info="Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto"
                variant="production"
              />

              {/* Consumption Multi-Series Chart */}
              <GraphCard
                title="Consumo"
                subtitle={`Rango: ${timeRangeData}`}
                infoText="Visualización del consumo de red, autoconsumo y excedentes del punto de suministro"
                variant="consumption"
              >
                <MultiSeriesBar
                  categories={consumptionCategories}
                  series={consumptionSeries}
                  variant="consumption"
                />
              </GraphCard>
            </>
          )}
          {isLoading && Array.from({ length: 2 }).map((_, i) => <LoadingGraphCard key={i} />)}
        </Box>
      </Box>
    </Box>
  );
};
