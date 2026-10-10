import { CoefficientHistory, Mui } from "conluz-web";

const supply = { id: "sup-1", code: "ES0031406912345678JN0F", name: "Casa de Lucía" };
const community = { id: "com-1", name: "Comunidad Energética de Torrent" };
const polideportivo = { id: "plant-1", name: "Planta Polideportivo" };
const colegio = { id: "plant-2", name: "Planta CEIP Lluís Vives" };

const period = (p: Record<string, unknown>) => ({
  supply,
  community,
  plant: polideportivo,
  createdAt: "2024-01-01T00:00:00Z",
  capabilities: { canReadSharingAgreement: true },
  validTo: null,
  ...p,
});

const singlePlant = [
  period({ id: "p1", coefficient: 0.1, validFrom: "2023-01-01T00:00:00Z", validTo: "2024-01-01T00:00:00Z", sharingAgreement: { id: "sa-1", name: "Reparto inicial 2023", status: "SUPERSEDED" } }),
  period({ id: "p2", coefficient: 0.15, validFrom: "2024-01-01T00:00:00Z", validTo: "2025-06-01T00:00:00Z", sharingAgreement: { id: "sa-2", name: "Reparto 2024", status: "SUPERSEDED" } }),
  period({ id: "p3", coefficient: 0.2, validFrom: "2025-06-01T00:00:00Z", sharingAgreement: { id: "sa-3", name: "Reparto 2025 · Planta Polideportivo", status: "PUBLISHED" } }),
] as any;

const twoPlants = [
  ...singlePlant,
  period({ id: "p4", plant: colegio, coefficient: 0.0825, validFrom: "2024-09-01T00:00:00Z", sharingAgreement: { id: "sa-9", name: "Reparto escolar 2024", status: "PUBLISHED" }, capabilities: { canReadSharingAgreement: false } }),
] as any;

export const SinglePlant = () => (
  <Mui.Box sx={{ width: 420 }}>
    <CoefficientHistory periods={singlePlant} currentSharingAgreementId="sa-3" />
  </Mui.Box>
);

export const AcrossPlants = () => (
  <Mui.Box sx={{ width: 420 }}>
    <CoefficientHistory periods={twoPlants} />
  </Mui.Box>
);

export const Loading = () => (
  <Mui.Box sx={{ width: 420 }}>
    <CoefficientHistory periods={undefined} isLoading />
  </Mui.Box>
);

export const LoadFailed = () => (
  <Mui.Box sx={{ width: 420 }}>
    <CoefficientHistory periods={undefined} error={new Error("500")} />
  </Mui.Box>
);

export const Empty = () => (
  <Mui.Box sx={{ width: 420 }}>
    <CoefficientHistory periods={[]} />
  </Mui.Box>
);
