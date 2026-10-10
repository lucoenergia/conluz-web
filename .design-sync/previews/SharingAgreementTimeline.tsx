import { SharingAgreementTimeline, Mui } from "conluz-web";

const base = {
  plantId: "plant-1",
  installedPowerKw: 45.6,
  createdBy: "user-1",
  updatedAt: null,
  updatedBy: null,
  file: null,
  capabilities: {},
};

const draft = {
  ...base,
  id: "sa-3",
  name: "Reparto 2026 · Planta Polideportivo",
  notes: "Incluye los tres nuevos suministros del barrio de San Miguel. Pendiente de revisar con la asamblea antes de publicar.",
  status: "DRAFT",
  createdAt: "2026-03-12T09:30:00Z",
};
const published = {
  ...base,
  id: "sa-2",
  name: "Reparto 2025 · Planta Polideportivo",
  notes: "Acuerdo aprobado en la asamblea de febrero.",
  status: "PUBLISHED",
  installedPowerKw: 40,
  createdAt: "2025-02-20T10:00:00Z",
};
const superseded = {
  ...base,
  id: "sa-1",
  name: "Reparto inicial 2024",
  notes: null,
  status: "SUPERSEDED",
  installedPowerKw: 40,
  createdAt: "2024-01-15T10:00:00Z",
};

const wrap = (children: any) => <Mui.Box sx={{ maxWidth: 640 }}>{children}</Mui.Box>;

export const DraftOverPublished = () =>
  wrap(
    <SharingAgreementTimeline
      plantId="plant-1"
      agreements={[{ ...draft, notes: null }, published] as any}
      canDelete={(agreement) => agreement.status === "DRAFT"}
      onDeleteRequest={() => {}}
    />,
  );

export const FirstAgreementDraft = () =>
  wrap(<SharingAgreementTimeline plantId="plant-1" agreements={[{ ...draft, notes: null, name: "Primer reparto · Planta Escola" }] as any} />);

export const PublishedAndSuperseded = () =>
  wrap(<SharingAgreementTimeline plantId="plant-1" agreements={[published, superseded] as any} />);
