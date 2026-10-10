import { ApplyCoefficientDateConfirmationModal } from "conluz-web";

const coefficient = (id: string, code: string, name: string | null) =>
  ({
    coefficientId: id,
    supply: { id: `supply-${id}`, code, name },
    coefficient: 0.026316,
    validFrom: null,
    validTo: null,
    applicationState: "PENDING",
    endState: "OPEN",
    endDate: null,
    currentCoefficient: null,
  }) as any;

export const SingleCoefficient = () => (
  <ApplyCoefficientDateConfirmationModal
    isOpen
    coefficients={[coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª")]}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);

export const Batch = () => (
  <ApplyCoefficientDateConfirmationModal
    isOpen
    coefficients={[
      coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª"),
      coefficient("2", "ES0031406987654321KP0F", "Bajo comercial Plaza Benimaclet"),
      coefficient("3", "ES0031406911223344LM0F", null),
    ]}
    hiddenCount={1}
    isPending={false}
    errorMessages={null}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);
