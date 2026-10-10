import { CorrectCoefficientDateConfirmationModal } from "conluz-web";

const coefficient = (id: string, code: string, name: string | null, validFrom: string) =>
  ({
    coefficientId: id,
    supply: { id: `supply-${id}`, code, name },
    coefficient: 0.026316,
    validFrom,
    validTo: null,
    applicationState: "APPLIED",
    endState: "OPEN",
    endDate: null,
    currentCoefficient: null,
  }) as any;

export const SingleCoefficient = () => (
  <CorrectCoefficientDateConfirmationModal
    isOpen
    coefficients={[coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª", "2026-02-01T00:00:00Z")]}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);

export const BatchWithDistinctDates = () => (
  <CorrectCoefficientDateConfirmationModal
    isOpen
    coefficients={[
      coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª", "2026-02-01T00:00:00Z"),
      coefficient("2", "ES0031406987654321KP0F", "Bajo comercial Plaza Benimaclet", "2026-02-15T00:00:00Z"),
      coefficient("3", "ES0031406911223344LM0F", null, "2026-02-01T00:00:00Z"),
    ]}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);
