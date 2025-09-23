import { useEffect, useMemo, useState, type FC } from "react";
import { StatsCard } from "../components/StatsCard/StatsCard";
import { Box, Typography } from "@mui/material";
import { BreadCrumb } from "../components/Breadcrumb/BreadCrumb";
import { Graph } from "../components/Graph/Graph";
import { useGetAllSupplies } from "../api/supplies/supplies";
import { DropdownSelector } from "../components/Forms/DropdownSelector";

// TODO: Set monitorig data methods when endpoints are ready

export const HomePage: FC = () => {
  const [selectedSupplyPoint, setSelectedSupplyPoint] = useState<string | null>(null);

  return (
    <Box className="grid md:grid-cols-2 gap-x-8 gap-y-4">
      <BreadCrumb className="md:col-span-2" steps={[{ label: "Inicio", href: "#" }]} />
      <SupplyPointAutocomplete value={selectedSupplyPoint} onChange={setSelectedSupplyPoint} />
      <ProductionPanel />
      <ConsumptionPanel />
    </Box>
  );
};

interface SupplyPointAutocompleteProps {
  value: string | null;
  onChange: (newValue: string | null) => void;
}

const SupplyPointAutocomplete: FC<SupplyPointAutocompleteProps> = ({ value, onChange }) => {
  const { data: supplyPoints, isLoading } = useGetAllSupplies({});

  const options = useMemo(
    () =>
      supplyPoints?.items
        ? supplyPoints.items.map((sp) => ({ label: sp.name ? sp.name : "", value: sp.id ? sp.id : "" }))
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
    <DropdownSelector
      options={options}
      value={value}
      onChange={onChange}
      isLoading={isLoading}
      label="Puntos de suministro"
    />
  );
};

const ProductionPanel: FC = () => {
  const categories = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const mockedData = [30, 40, 45, 50, 49, 60, 70, 91, 35, 45, 55, 65]; //mocked data para 12 meses

  const measurementData = [
    {
      name: "Producción Asignada",
      value: [],
      info: "Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto",
    },
  ];
  return (
    <Box className="grid-rows-subgrid row-span-4 grid">
      <Typography variant="h2" className="text-3xl">
        Producción
      </Typography>
      <Typography variant="h3" className="text-xl">
        Energía generada por la comunidad energética
      </Typography>
      <StatsCard stats={[{ label: "Producción", value: "25kWh" }]} />
      {measurementData.map((item, index) => (
        <Graph key={index} title={item.name} values={mockedData} xAxis={categories} info={item.info} />
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
    <Box className="grid-rows-subgrid row-span-4 grid">
      <Typography variant="h2" className="text-3xl">
        Consumo
      </Typography>
      <Typography variant="h3" className="text-xl">
        Energía consumida por la comunidad energética
      </Typography>
      <StatsCard
        stats={[
          { label: "Consumo", value: "25kWh" },
          { label: "Autoconsumo", value: "25kWh" },
          { label: "Excedentes", value: "25kWh" },
          { label: "Porcentaje de autoconsumo", value: "25%" },
          { label: "Porcentaje de aprovechamiento", value: "25%" },
        ]}
      />
      {measurementData.map((item, index) => (
        <Graph key={index} title={item.name} values={mockedData} xAxis={categories} info={item.info} />
      ))}
    </Box>
  );
};
