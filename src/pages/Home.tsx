import { useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { EnhancedGraph } from "../components/Graph";
import { useGetSuppliesByUserId } from "../api/users/users";
import { useGetAllSupplies } from "../api/supplies/supplies";
import { useGetDailyProduction } from "../api/production/production";
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
        <ProductionPanel />
        <ConsumptionPanel />
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
    {},
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

const ProductionPanel: FC = () => {
  // Calculate date range for last 7 days including today
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 1); // Include today by setting end to tomorrow
    const start = new Date();
    start.setDate(start.getDate() - 6); // 6 days ago + today = 7 days

    // Format: 2025-09-24T00:00:00.000+02:00
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

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
    };
  }, []);

  // Fetch production data
  const { data: productionData } = useGetDailyProduction(
    {
      startDate,
      endDate,
    },
    {
      query: { enabled: true },
    },
  );

  // Process data for chart
  const { categories, values } = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      return { categories: [], values: [] };
    }

    const cats = productionData.map((item) => {
      const date = new Date(item.time || "");
      return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
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
            value: "25 kWh",
            trend: 12,
            trendLabel: "vs mes anterior",
            icon: <BoltIcon sx={{ fontSize: 24 }} />,
            color: "#8b5cf6",
          },
          {
            label: "Pico Máximo",
            value: "3.2 kW",
            icon: <ElectricMeterIcon sx={{ fontSize: 24 }} />,
            color: "#3b82f6",
          },
          {
            label: "Horas Pico",
            value: "7.8 h",
            trend: 5,
            icon: <BatteryChargingFullIcon sx={{ fontSize: 24 }} />,
            color: "#10b981",
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

const ConsumptionPanel: FC = () => {
  const categories = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const mockedData = [30, 40, 45, 50, 49, 60, 70, 91, 35, 45, 55, 65]; //mocked data para 12 meses

  const measurementData = [
    {
      name: "Consumo Asignado",
      value: [],
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
        title="Consumo"
        subtitle="Energía consumida por la comunidad energética"
        variant="consumption"
        icon={<PowerIcon sx={{ fontSize: 32 }} />}
        stats={[
          {
            label: "Consumo Total",
            value: "25 kWh",
            trend: -8,
            trendLabel: "vs mes anterior",
            icon: <PowerIcon sx={{ fontSize: 24 }} />,
            color: "#ef4444",
          },
          {
            label: "Autoconsumo",
            value: "25 kWh",
            trend: 15,
            icon: <EvStationIcon sx={{ fontSize: 24 }} />,
            color: "#10b981",
          },
          {
            label: "Excedentes",
            value: "25 kWh",
            icon: <BatteryChargingFullIcon sx={{ fontSize: 24 }} />,
            color: "#f59e0b",
          },
        ]}
      />

      {measurementData.map((item, index) => (
        <EnhancedGraph
          key={index}
          title={item.name}
          subtitle="Últimos 12 meses"
          values={mockedData}
          xAxis={categories}
          info={item.info}
          variant="consumption"
        />
      ))}
    </Box>
  );
};
