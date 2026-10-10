import { CloseCoefficientConfirmationModal } from "conluz-web";

const coefficient = {
  coefficientId: "1",
  supply: { id: "supply-1", code: "ES0031406912345678JN0F", name: "Vivienda Calle Murta 12, 3ª" },
  coefficient: 0.026316,
  validFrom: "2025-03-01T00:00:00Z",
  validTo: null,
  applicationState: "APPLIED",
  endState: "DERIVED",
  endDate: "2026-02-01T00:00:00Z",
  currentCoefficient: null,
} as any;

export const Open = () => (
  <CloseCoefficientConfirmationModal
    isOpen
    coefficients={[coefficient]}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);

export const WithError = () => (
  <CloseCoefficientConfirmationModal
    isOpen
    coefficients={[coefficient]}
    isPending={false}
    errorMessages={["La fecha de cierre debe ser posterior a la fecha de aplicación (01/03/2025)."]}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);
