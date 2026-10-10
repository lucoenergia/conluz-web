import { DeactivateOrReopenCoefficientConfirmationModal } from "conluz-web";

const coefficient = (id: string, code: string, name: string | null) =>
  ({
    coefficientId: id,
    supply: { id: `supply-${id}`, code, name },
    coefficient: 0.026316,
    validFrom: "2026-02-01T00:00:00Z",
    validTo: null,
    applicationState: "APPLIED",
    endState: "OPEN",
    endDate: null,
    currentCoefficient: null,
  }) as any;

export const Deactivate = () => (
  <DeactivateOrReopenCoefficientConfirmationModal
    isOpen
    action="deactivate"
    coefficients={[coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª")]}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);

export const ReopenBatch = () => (
  <DeactivateOrReopenCoefficientConfirmationModal
    isOpen
    action="reopen"
    coefficients={[
      coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª"),
      coefficient("2", "ES0031406987654321KP0F", "Bajo comercial Plaza Benimaclet"),
    ]}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);
