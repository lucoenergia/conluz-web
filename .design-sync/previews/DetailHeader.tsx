import { useEffect, useRef } from "react";
import { DetailHeader, Mui, Icons, colors } from "conluz-web";

const activeChip = (
  <Mui.Chip
    label="Activo"
    color="success"
    size="small"
    sx={{ fontWeight: 600, color: "white", backgroundColor: colors.success.main }}
  />
);

const supplyFacts = [
  { label: "CUPS", value: "ES0031406912345678JN0F", copyable: "ES0031406912345678JN0F" },
  { label: "Potencia contratada", shortLabel: "Potencia", value: "5,75 kW" },
  { label: "Coeficiente", value: "2,4500 %" },
] as const;

const supplyDetails = [
  { label: "Titular", value: "Lucía Ferrer Puig" },
  { label: "Distribuidora", value: "i-DE Redes Eléctricas" },
  { label: "Alta en la comunidad", value: "12 mar 2025" },
  { label: "Tarifa", value: "2.0TD" },
  { label: "Notas", value: "Instalación de autoconsumo individual previa, sin batería.", wide: true },
];

const menu = (
  <Mui.IconButton aria-label="Más acciones para Casa de Lucía">
    <Icons.MoreVert />
  </Mui.IconButton>
);

export const SupplyDetail = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <DetailHeader
      icon={<Icons.ElectricMeter />}
      title="Casa de Lucía"
      subtitle="Calle del Sol 14, 46900 Torrent, Valencia"
      subtitleIcon={<Icons.LocationOn />}
      status={activeChip}
      keyFacts={supplyFacts}
      details={supplyDetails}
      menu={menu}
    />
  </Mui.Box>
);

export const DetailsOpen = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button[aria-expanded]")?.click();
  }, []);
  return (
    <Mui.Box ref={ref} sx={{ width: "100%" }}>
      <DetailHeader
        icon={<Icons.ElectricMeter />}
        title="Casa de Lucía"
        subtitle="Calle del Sol 14, 46900 Torrent, Valencia"
        subtitleIcon={<Icons.LocationOn />}
        status={activeChip}
        keyFacts={supplyFacts}
        details={supplyDetails}
        menu={menu}
      />
    </Mui.Box>
  );
};

export const ListPage = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <DetailHeader
      variant="list"
      icon={<Icons.ElectricMeter />}
      title="Puntos de Suministro"
      subtitle="Gestiona los puntos de suministro de la comunidad energética"
      keyFacts={[
        { label: "Total", value: 128 },
        { label: "Activos", value: 121 },
        { label: "Inactivos", value: 7 },
      ]}
    />
  </Mui.Box>
);

export const Loading = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <DetailHeader
      icon={<Icons.SolarPower />}
      title="Planta Polideportivo"
      subtitle="Avenida del Mediterráneo 88, 46900 Torrent, Valencia"
      subtitleIcon={<Icons.LocationOn />}
      keyFacts={[{ label: "Potencia instalada", value: "45,6 kW" }]}
      isLoading
    />
  </Mui.Box>
);
