import { SharingAgreementApplicationPanel, Mui } from "conluz-web";

const inForceFrom2025 = {
  sharingAgreement: { id: "sa-2025", name: "Reparto 2025 · Planta Polideportivo", status: "PUBLISHED" },
};

const supply = (id: string, code: string, name: string | null) => ({ id, code, name });

const row = (
  id: string,
  sup: ReturnType<typeof supply>,
  coefficient: number,
  validFrom: string | null,
  currentCoefficient: number | null,
) => ({
  coefficientId: id,
  supply: sup,
  coefficient,
  validFrom,
  validTo: null,
  applicationState: validFrom ? "APPLIED" : "PENDING",
  endState: "OPEN",
  endDate: null,
  currentCoefficient: currentCoefficient === null ? null : { ...inForceFrom2025, coefficient: currentCoefficient },
});

const supplies = [
  supply("s1", "ES0031406912345678JN0F", "Casa Ferrer · C/ Sant Vicent 12"),
  supply("s2", "ES0031406987654321AB1Q", "Bar La Plaça"),
  supply("s3", "ES0031406911223344CD0R", null),
  supply("s4", "ES0031406955667788EF1S", "Escuela Infantil Els Xiquets"),
  supply("s5", "ES0031406999887766GH0T", null),
  supply("s6", "ES0031406944332211JK1V", "Comercio Hnos. Molina"),
];

export const WithNewSupplyPending = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <SharingAgreementApplicationPanel
      coefficients={[
        row("c1", supplies[0], 0.25, "2026-04-01", 0.22),
        row("c2", supplies[1], 0.2, "2026-04-01", 0.2),
        row("c3", supplies[2], 0.15, "2026-04-01", 0.18),
        row("c4", supplies[3], 0.15, null, 0.16),
        row("c5", supplies[4], 0.125, null, null),
        row("c6", supplies[5], 0.125, null, null),
      ] as any}
    />
  </Mui.Box>
);

export const PendingKeepPreviousCoefficient = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <SharingAgreementApplicationPanel
      coefficients={[
        row("c1", supplies[0], 0.25, "2026-04-01", 0.22),
        row("c2", supplies[1], 0.2, "2026-04-01", 0.2),
        row("c3", supplies[2], 0.15, "2026-04-01", 0.18),
        row("c4", supplies[3], 0.15, "2026-04-03", 0.16),
        row("c5", supplies[4], 0.125, "2026-04-03", 0.12),
        row("c6", supplies[5], 0.125, null, 0.12),
      ] as any}
    />
  </Mui.Box>
);

export const NoneApplied = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <SharingAgreementApplicationPanel
      coefficients={[
        row("c1", supplies[0], 0.4, null, 0.35),
        row("c2", supplies[1], 0.35, null, 0.35),
        row("c3", supplies[2], 0.25, null, 0.3),
      ] as any}
    />
  </Mui.Box>
);
