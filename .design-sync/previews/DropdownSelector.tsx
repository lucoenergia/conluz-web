import { useState } from "react";
import { DropdownSelector, Mui, Icons } from "conluz-web";

const supplies = [
  { label: "Casa de Lucía · ES0031406912345678JN0F", value: "sup-1" },
  { label: "Local de la asociación · ES0031406987654321QW1A", value: "sup-2" },
  { label: "Panadería Martínez · ES0031406900011122ZX9B", value: "sup-3" },
];

export const Selected = () => {
  const [v, setV] = useState<string | null>("sup-1");
  return (
    <Mui.Box sx={{ maxWidth: 520 }}>
      <DropdownSelector label="Punto de suministro" options={supplies} value={v} onChange={setV} />
    </Mui.Box>
  );
};

export const NothingSelected = () => {
  const [v, setV] = useState<string | null>(null);
  return (
    <Mui.Box sx={{ maxWidth: 520 }}>
      <DropdownSelector label="Punto de suministro" options={supplies} value={v} onChange={setV} />
    </Mui.Box>
  );
};

export const Loading = () => (
  <Mui.Box sx={{ maxWidth: 520 }}>
    <DropdownSelector label="Punto de suministro" options={[]} value={null} isLoading />
  </Mui.Box>
);

export const CustomIcon = () => {
  const [v, setV] = useState<string | null>("plant-1");
  return (
    <Mui.Box sx={{ maxWidth: 520 }}>
      <DropdownSelector
        label="Planta"
        icon={<Icons.SolarPower />}
        options={[
          { label: "Planta Polideportivo Torrent", value: "plant-1" },
          { label: "Cubierta CEIP Lluís Vives", value: "plant-2" },
        ]}
        value={v}
        onChange={setV}
      />
    </Mui.Box>
  );
};
