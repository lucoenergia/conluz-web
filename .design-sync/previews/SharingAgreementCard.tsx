import { SharingAgreementCard, Mui } from "conluz-web";

const base = {
  plantId: "plant-1",
  installedPowerKw: 45.6,
  createdAt: "2026-03-12T09:30:00Z",
  createdBy: "user-1",
  updatedAt: null,
  updatedBy: null,
  file: null,
  capabilities: {},
};

export const Draft = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <SharingAgreementCard
      plantId="plant-1"
      canDelete
      onDeleteRequest={() => {}}
      agreement={{
        ...base,
        id: "sa-3",
        name: "Reparto 2026 · Planta Polideportivo",
        notes: "Incluye los tres nuevos suministros del barrio de San Miguel. Pendiente de revisar con la asamblea antes de publicar.",
        status: "DRAFT",
      } as any}
    />
  </Mui.Box>
);

export const Published = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <SharingAgreementCard
      plantId="plant-1"
      agreement={{
        ...base,
        id: "sa-2",
        name: "Reparto 2025 · Planta Polideportivo",
        notes: "Acuerdo aprobado en la asamblea de febrero.",
        status: "PUBLISHED",
        createdAt: "2025-02-20T10:00:00Z",
      } as any}
    />
  </Mui.Box>
);

export const Superseded = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <SharingAgreementCard
      plantId="plant-1"
      agreement={{
        ...base,
        id: "sa-1",
        name: "Reparto inicial 2024",
        notes: null,
        status: "SUPERSEDED",
        createdAt: "2024-01-15T10:00:00Z",
      } as any}
    />
  </Mui.Box>
);
