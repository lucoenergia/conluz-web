import { PublishSharingAgreementConfirmationModal } from "conluz-web";

export const Open = () => (
  <PublishSharingAgreementConfirmationModal
    isOpen
    agreementName="Reparto 2026 · Planta Polideportivo"
    fileSumLabel="100,0000 %"
    coefficientCount={38}
    onCancel={() => {}}
    onConfirm={() => {}}
  />
);
