import { SharingAgreementFormDialog } from "conluz-web";

export const Create = () => (
  <SharingAgreementFormDialog
    isOpen
    mode="create"
    plantName="Polideportivo Municipal"
    initialValues={{ nominalPowerKW: 90 }}
    onCancel={() => {}}
    onSubmit={() => {}}
  />
);

/** Editing an agreement that already has coefficients: changing the power warns what it changes. */
export const EditWithCoefficients = () => (
  <SharingAgreementFormDialog
    isOpen
    mode="edit"
    initialValues={{
      name: "Reparto 2026",
      notes: "Acordado en la asamblea del 12 de diciembre de 2025.",
      nominalPowerKW: 90,
      distributorFileSentOn: "2026-01-08",
    }}
    hasCoefficients
    onCancel={() => {}}
    onSubmit={() => {}}
  />
);
