import type { SharingAgreementResponse } from "../../api/models/sharingAgreementResponse";

export interface CoefficientMap {
  [supplyId: string]: number;
}

export const DONUT_COLORS = [
  "#667eea", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
];

export const SAMPLE_DISTRIBUTOR_TXT = `# Fichero de reparto - Comunidad Energética Castellnovo
# Distribuidora: i-DE Redes Eléctricas Inteligentes
# Fecha de emisión: 2026-05-08
# Formato: CUPS;COEFICIENTE
ES0021000004271234AB;0,145000
ES0021000004275678CD;0,132000
ES0021000004279012EF;0,118000
ES0021000004273456GH;0,102000
ES0021000004277890IJ;0,124000
ES0021000004274321KL;0,118000
ES0021000004270987OP;0,116000
ES0021000004276543QR;0,082000
ES0021000004272109ST;0,063000`;

export function getAgreementStatus(a: SharingAgreementResponse): "current" | "past" {
  return a.status === "ACTIVE" ? "current" : "past";
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtPeriod(a: SharingAgreementResponse): string {
  const s = fmtDate(a.startDate);
  const e = a.endDate ? fmtDate(a.endDate) : "en curso";
  return `${s} → ${e}`;
}

export function fmtCoef(v: number | null | undefined): string {
  if (v === undefined || v === null) return "—";
  return (v * 100).toFixed(2) + "%";
}

export function buildAgreementLabel(a: SharingAgreementResponse): string {
  const startYear = a.startDate ? new Date(a.startDate).getFullYear() : "?";
  const endYear = a.endDate ? new Date(a.endDate).getFullYear() : "en curso";
  return startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
}
