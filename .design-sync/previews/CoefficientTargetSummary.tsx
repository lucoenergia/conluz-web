import { CoefficientTargetSummary, Mui } from "conluz-web";

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

const coefficients = [
  coefficient("1", "ES0031406912345678JN0F", "Vivienda Calle Murta 12, 3ª"),
  coefficient("2", "ES0031406987654321KP0F", "Bajo comercial Plaza Benimaclet"),
  coefficient("3", "ES0031406911223344LM0F", null),
  coefficient("4", "ES0031406955667788QR0F", "Vivienda Calle Barón de San Petrillo 4"),
];

export const AllVisible = () => (
  <Mui.Box sx={{ maxWidth: 480 }}>
    <CoefficientTargetSummary coefficients={coefficients} hiddenCount={0} />
  </Mui.Box>
);

export const SomeHiddenByFilter = () => (
  <Mui.Box sx={{ maxWidth: 480 }}>
    <CoefficientTargetSummary coefficients={coefficients} hiddenCount={2} />
  </Mui.Box>
);
