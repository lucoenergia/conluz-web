import { useEffect, useRef } from "react";
import { PlantDetailHeader, Mui } from "conluz-web";

const plant = {
  id: "plant-1",
  providerCode: "HUAWEI-TOR-0012",
  regulatoryCode: "ES0031406900011122ZX9BA000",
  supply: { id: "sup-1", code: "ES0031406912345678JN0F", name: "Polideportivo municipal" },
  name: "Planta Polideportivo",
  address: "Calle del Polideportivo 3, 46900 Torrent, Valencia",
  description: "Cubierta fotovoltaica del polideportivo municipal, 112 módulos de 410 W orientados al sur.",
  inverterProvider: "Huawei",
  totalPower: 45.6,
  connectionDate: "2024-03-12",
  community: { id: "com-1", name: "Comunidad Energética de Torrent" },
  capabilities: { canRead: true, canManage: true, canListSharingAgreements: true, canManageSharingAgreements: true, canReadSupply: true },
} as any;

export const Full = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantDetailHeader plant={plant} />
  </Mui.Box>
);

export const SupplyNotReadable = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantDetailHeader
      plant={{ ...plant, description: null, capabilities: { ...plant.capabilities, canReadSupply: false } }}
    />
  </Mui.Box>
);

export const SparseData = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantDetailHeader
      plant={{ ...plant, name: "Planta CEIP Lluís Vives", regulatoryCode: null, providerCode: "", inverterProvider: null, connectionDate: null, description: null, supply: null, totalPower: 22.4 }}
    />
  </Mui.Box>
);

/** Loading and error render the same shell (title fallback, no facts); the page shows the spinner or alert around it. */
export const LoadingOrFailed = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantDetailHeader isLoading />
  </Mui.Box>
);

export const DetailsExpanded = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button[aria-expanded='false']")?.click();
  }, []);
  return (
    <Mui.Box ref={ref} sx={{ width: "100%" }}>
      <PlantDetailHeader plant={plant} />
    </Mui.Box>
  );
};
