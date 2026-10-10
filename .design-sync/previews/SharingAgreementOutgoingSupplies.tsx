import { SharingAgreementOutgoingSupplies, Mui } from "conluz-web";

// Outgoing supplies are in force today, so they always come from PUBLISHED agreements.
const PUBLISHED_2025 = { id: "sa-2025", name: "Reparto 2025 · Planta Polideportivo", status: "PUBLISHED" };
const PUBLISHED_AMPLIACION = { id: "sa-2025b", name: "Ampliación otoño 2025", status: "PUBLISHED" };

const active = (id: string, supply: { id: string; code: string; name: string | null }, coefficient: number, agreement: typeof PUBLISHED_2025) =>
  ({
    id,
    supply,
    community: { id: "com-1", name: "Comunitat Energètica Benimaclet" },
    plant: { id: "plant-1", name: "Planta Polideportivo" },
    sharingAgreement: agreement,
    coefficient,
    validFrom: "2025-02-01",
    validTo: null,
    createdAt: "2025-01-20T10:00:00Z",
    capabilities: {},
  }) as any;

const outgoing = [
  active("p1", { id: "s7", code: "ES0031406933445566LM0W", name: "Panadería Sant Josep" }, 0.08, PUBLISHED_2025),
  active("p2", { id: "s8", code: "ES0031406977889900NP1X", name: null }, 0.041667, PUBLISHED_AMPLIACION),
];

const noop = () => {};
const wrap = (children: any) => <Mui.Box sx={{ maxWidth: 880 }}>{children}</Mui.Box>;

export const Default = () =>
  wrap(
    <SharingAgreementOutgoingSupplies
      outgoing={outgoing}
      isError={false}
      onRetry={noop}
      powerByAgreementId={
        new Map([
          ["sa-2025", { status: "success", installedPowerKw: 40 }],
          ["sa-2025b", { status: "success", installedPowerKw: 45.6 }],
        ]) as any
      }
    />,
  );

export const PowerLoading = () =>
  wrap(
    <SharingAgreementOutgoingSupplies
      outgoing={outgoing}
      isError={false}
      onRetry={noop}
      powerByAgreementId={new Map([["sa-2025", { status: "success", installedPowerKw: 40 }]]) as any}
    />,
  );

export const PowerUnavailable = () =>
  wrap(
    <SharingAgreementOutgoingSupplies
      outgoing={outgoing.slice(0, 1)}
      isError={false}
      onRetry={noop}
      powerByAgreementId={new Map([["sa-2025", { status: "error" }]]) as any}
    />,
  );

export const LoadError = () =>
  wrap(<SharingAgreementOutgoingSupplies outgoing={[]} isError onRetry={noop} powerByAgreementId={new Map()} />);
