import { useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { EnhancedGraph } from "../components/Graph";
import { EnhancedGraphCard } from "../components/Graph/EnhancedGraphCard";
import { EnhancedMultiSeriesBar } from "../components/Graph/EnhancedMultiSeriesBar";
import { useGetSuppliesByUserId } from "../api/users/users";
import {
  useGetAllSupplies,
  useGetSupplyDailyProduction,
  useGetSupplyDailyConsumption,
} from "../api/supplies/supplies";
import { EnhancedDropdownSelector } from "../components/Forms/EnhancedDropdownSelector";
import { EnhancedStatsCard } from "../components/EnhancedStatsCard";
import BoltIcon from "@mui/icons-material/Bolt";
import PowerIcon from "@mui/icons-material/Power";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import EvStationIcon from "@mui/icons-material/EvStation";
import { useLoggedUser } from "../context/logged-user.context";
import { UserResponseRole } from "../api/models";

// TODO: Set monitorig data methods when endpoints are ready

export const HomePage: FC = () => {
  const [selectedSupplyPoint, setSelectedSupplyPoint] = useState<string | null>(null);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 2.5, md: 3 },
        p: { xs: 1, sm: 2, md: 3 },
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "visible",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <EnhancedBreadCrumb steps={[{ label: "Inicio", href: "/" }]} />
      <SupplyPointAutocomplete value={selectedSupplyPoint} onChange={setSelectedSupplyPoint} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr",
            md: "1fr 1fr",
          },
          gap: { xs: 2, sm: 2.5, md: 3 },
          width: "100%",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "& > *": {
            minWidth: 0,
            maxWidth: "100%",
          },
        }}
      >
        <ProductionPanel supplyId={selectedSupplyPoint} />
        <ConsumptionPanel supplyId={selectedSupplyPoint} />
      </Box>
    </Box>
  );
};

interface SupplyPointAutocompleteProps {
  value: string | null;
  onChange: (newValue: string | null) => void;
}

const SupplyPointAutocomplete: FC<SupplyPointAutocompleteProps> = ({ value, onChange }) => {
  const loggedUser = useLoggedUser();
  const isAdmin = loggedUser?.role === UserResponseRole.ADMIN;

  const { data: userSupplies, isLoading: isLoadingUserSupplies } = useGetSuppliesByUserId(
    loggedUser?.id || "",
    {
      query: { enabled: !!loggedUser?.id && !isAdmin },
    },
  );

  const { data: allSupplies, isLoading: isLoadingAllSupplies } = useGetAllSupplies(
    { size: 100 },
    {
      query: { enabled: isAdmin },
    },
  );

  const supplyPoints = isAdmin ? allSupplies?.items : userSupplies;
  const isLoading = isAdmin ? isLoadingAllSupplies : isLoadingUserSupplies;

  const options = useMemo(
    () =>
      supplyPoints
        ? supplyPoints.map((sp) => ({
            label: [sp.name, sp.address].filter(Boolean).join(" - ") || "",
            value: sp.id ? sp.id : "",
          }))
        : [],
    [supplyPoints],
  );
  useEffect(() => {
    // Preselect the first supply point once options are loaded
    if (options.length && value === null) {
      onChange(options[0].value);
    }
  }, [options]);
  return (
    <EnhancedDropdownSelector
      options={options}
      value={value}
      onChange={onChange}
      isLoading={isLoading}
      label="Puntos de suministro"
    />
  );
};

interface ProductionPanelProps {
  supplyId: string | null;
}

const ProductionPanel: FC<ProductionPanelProps> = ({ supplyId }) => {
  // Calculate date range for last 7 days including today
  const { startDate, endDate, prevStartDate, prevEndDate } = useMemo(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const offset = date.getTimezoneOffset();
      const absOffset = Math.abs(offset);
      const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const offsetMinutes = String(absOffset % 60).padStart(2, '0');
      const offsetSign = offset <= 0 ? '+' : '-';

      return `${year}-${month}-${day}T00:00:00.000${offsetSign}${offsetHours}:${offsetMinutes}`;
    };

    // Current period: last 7 days including today
    const end = new Date();
    end.setDate(end.getDate() + 1); // Include today by setting end to tomorrow
    const start = new Date();
    start.setDate(start.getDate() - 6); // 6 days ago + today = 7 days

    // Previous period: 7 days before the current period
    const prevEnd = new Date();
    prevEnd.setDate(prevEnd.getDate() - 6); // Start of current period
    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 13); // 7 days before that

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
      prevStartDate: formatDate(prevStart),
      prevEndDate: formatDate(prevEnd),
    };
  }, []);

  // Fetch production data for current period
  const { data: productionData } = useGetSupplyDailyProduction(
    supplyId || "",
    {
      startDate,
      endDate,
    },
    {
      query: { enabled: !!supplyId },
    },
  );

  // Fetch production data for previous period
  const { data: prevProductionData } = useGetSupplyDailyProduction(
    supplyId || "",
    {
      startDate: prevStartDate,
      endDate: prevEndDate,
    },
    {
      query: { enabled: !!supplyId },
    },
  );

  // Calculate statistics from production data
  const { totalProduction, peakPower, productionTrend } = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      return { totalProduction: 0, peakPower: 0, productionTrend: undefined };
    }

    const total = productionData.reduce((sum, item) => sum + (item.power || 0), 0);
    const peak = Math.max(...productionData.map((item) => item.power || 0));

    let trend: number | undefined = undefined;
    if (prevProductionData && prevProductionData.length > 0) {
      const prevTotal = prevProductionData.reduce((sum, item) => sum + (item.power || 0), 0);
      if (prevTotal > 0) {
        trend = ((total - prevTotal) / prevTotal) * 100;
      }
    }

    return { totalProduction: total, peakPower: peak, productionTrend: trend };
  }, [productionData, prevProductionData]);

  // Process data for chart
  const { categories, values } = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      return { categories: [], values: [] };
    }

    const cats = productionData.map((item) => {
      const dateStr = item.time || "";
      if (!dateStr) return "";

      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString("es-ES", { month: "short" });
      return `${day} ${month}`;
    });

    const vals = productionData.map((item) => item.power || 0);

    return { categories: cats, values: vals };
  }, [productionData]);

  const measurementData = [
    {
      name: "Producción Asignada",
      value: values,
      info: "Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        minWidth: 0,
        "& > *": {
          minWidth: 0,
        },
      }}
    >
      <EnhancedStatsCard
        title="Producción"
        subtitle="Energía generada por la comunidad energética"
        variant="production"
        icon={<SolarPowerIcon sx={{ fontSize: 32 }} />}
        stats={[
          {
            label: "Producción Total",
            value: `${totalProduction.toFixed(2)} kWh`,
            trend: productionTrend !== undefined ? Math.round(productionTrend) : undefined,
            trendLabel: "vs 7 días anteriores",
            icon: <BoltIcon sx={{ fontSize: 24 }} />,
            color: "#8b5cf6",
          },
          {
            label: "Pico Máximo",
            value: `${peakPower.toFixed(2)} kW`,
            icon: <ElectricMeterIcon sx={{ fontSize: 24 }} />,
            color: "#3b82f6",
          },
        ]}
      />
      {measurementData.map((item, index) => (
        <EnhancedGraph
          key={index}
          title={item.name}
          subtitle="Últimos 7 días"
          values={item.value}
          xAxis={categories}
          info={item.info}
          variant="production"
        />
      ))}
    </Box>
  );
};

interface ConsumptionPanelProps {
  supplyId: string | null;
}

const ConsumptionPanel: FC<ConsumptionPanelProps> = ({ supplyId }) => {
  // Calculate date range for last 7 days including today
  const { startDate, endDate, prevStartDate, prevEndDate } = useMemo(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const offset = date.getTimezoneOffset();
      const absOffset = Math.abs(offset);
      const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const offsetMinutes = String(absOffset % 60).padStart(2, '0');
      const offsetSign = offset <= 0 ? '+' : '-';

      return `${year}-${month}-${day}T00:00:00.000${offsetSign}${offsetHours}:${offsetMinutes}`;
    };

    // Current period: last 7 days including today
    const end = new Date();
    end.setDate(end.getDate() + 1); // Include today by setting end to tomorrow
    const start = new Date();
    start.setDate(start.getDate() - 6); // 6 days ago + today = 7 days

    // Previous period: 7 days before the current period
    const prevEnd = new Date();
    prevEnd.setDate(prevEnd.getDate() - 6); // Start of current period
    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 13); // 7 days before that

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
      prevStartDate: formatDate(prevStart),
      prevEndDate: formatDate(prevEnd),
    };
  }, []);

  // Fetch consumption data for current period
  const { data: consumptionData } = useGetSupplyDailyConsumption(
    supplyId || "",
    {
      startDate,
      endDate,
    },
    {
      query: { enabled: !!supplyId },
    },
  );

  // Fetch consumption data for previous period
  const { data: prevConsumptionData } = useGetSupplyDailyConsumption(
    supplyId || "",
    {
      startDate: prevStartDate,
      endDate: prevEndDate,
    },
    {
      query: { enabled: !!supplyId },
    },
  );

  // Calculate statistics from consumption data
  const { totalConsumption, totalSelfConsumption, totalSurplus, consumptionTrend, selfConsumptionTrend, surplusTrend } = useMemo(() => {
    if (!consumptionData || consumptionData.length === 0) {
      return {
        totalConsumption: 0,
        totalSelfConsumption: 0,
        totalSurplus: 0,
        consumptionTrend: undefined,
        selfConsumptionTrend: undefined,
        surplusTrend: undefined,
      };
    }

    const consumption = consumptionData.reduce((sum, item) => sum + (item.consumptionKWh || 0), 0);
    const selfConsumption = consumptionData.reduce((sum, item) => sum + (item.selfConsumptionEnergyKWh || 0), 0);
    const surplus = consumptionData.reduce((sum, item) => sum + (item.surplusEnergyKWh || 0), 0);

    let cTrend: number | undefined = undefined;
    let scTrend: number | undefined = undefined;
    let sTrend: number | undefined = undefined;

    if (prevConsumptionData && prevConsumptionData.length > 0) {
      const prevConsumption = prevConsumptionData.reduce((sum, item) => sum + (item.consumptionKWh || 0), 0);
      const prevSelfConsumption = prevConsumptionData.reduce((sum, item) => sum + (item.selfConsumptionEnergyKWh || 0), 0);
      const prevSurplus = prevConsumptionData.reduce((sum, item) => sum + (item.surplusEnergyKWh || 0), 0);

      if (prevConsumption > 0) {
        cTrend = ((consumption - prevConsumption) / prevConsumption) * 100;
      }
      if (prevSelfConsumption > 0) {
        scTrend = ((selfConsumption - prevSelfConsumption) / prevSelfConsumption) * 100;
      }
      if (prevSurplus > 0) {
        sTrend = ((surplus - prevSurplus) / prevSurplus) * 100;
      }
    }

    return {
      totalConsumption: consumption,
      totalSelfConsumption: selfConsumption,
      totalSurplus: surplus,
      consumptionTrend: cTrend,
      selfConsumptionTrend: scTrend,
      surplusTrend: sTrend,
    };
  }, [consumptionData, prevConsumptionData]);

  // Process data for multi-series chart
  const { categories, series } = useMemo(() => {
    if (!consumptionData || consumptionData.length === 0) {
      return { categories: [], series: [] };
    }

    const cats = consumptionData.map((item) => {
      // Use the date field directly if available, or parse from time
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
      categories: cats,
      series: seriesData,
    };
  }, [consumptionData]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        minWidth: 0,
        "& > *": {
          minWidth: 0,
        },
      }}
    >
      <EnhancedStatsCard
        title="Consumo"
        subtitle="Energía consumida por la comunidad energética"
        variant="consumption"
        icon={<PowerIcon sx={{ fontSize: 32 }} />}
        stats={[
          {
            label: "Consumo Total",
            value: `${totalConsumption.toFixed(2)} kWh`,
            trend: consumptionTrend !== undefined ? Math.round(consumptionTrend) : undefined,
            trendLabel: "vs 7 días anteriores",
            icon: <PowerIcon sx={{ fontSize: 24 }} />,
            color: "#ef4444",
          },
          {
            label: "Autoconsumo",
            value: `${totalSelfConsumption.toFixed(2)} kWh`,
            trend: selfConsumptionTrend !== undefined ? Math.round(selfConsumptionTrend) : undefined,
            trendLabel: "vs 7 días anteriores",
            icon: <EvStationIcon sx={{ fontSize: 24 }} />,
            color: "#10b981",
          },
          {
            label: "Excedentes",
            value: `${totalSurplus.toFixed(2)} kWh`,
            trend: surplusTrend !== undefined ? Math.round(surplusTrend) : undefined,
            trendLabel: "vs 7 días anteriores",
            icon: <BatteryChargingFullIcon sx={{ fontSize: 24 }} />,
            color: "#f59e0b",
          },
        ]}
      />

      <EnhancedGraphCard
        title="Consumo Asignado"
        subtitle="Últimos 7 días"
        infoText="Visualización del consumo total, autoconsumo y excedentes del punto de suministro"
        variant="consumption"
      >
        <EnhancedMultiSeriesBar
          categories={categories}
          series={series}
          variant="consumption"
        />
      </EnhancedGraphCard>
    </Box>
  );
};
