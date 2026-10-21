import { DeleteSupplyConfirmationModal } from "conluz-web";

const noop = () => {};

export const Open = () => (
  <DeleteSupplyConfirmationModal
    isOpen
    code="ES0031406912345678JN0F"
    name="Casa de Lucía"
    ownerName="Lucía Martínez Soler"
    onCancel={noop}
    onConfirm={noop}
  />
);

export const WithoutNameOrOwner = () => (
  <DeleteSupplyConfirmationModal isOpen code="ES0031406987654321QW1A" onCancel={noop} onConfirm={noop} />
);

export const Deleting = () => (
  <DeleteSupplyConfirmationModal
    isOpen
    code="ES0031406912345678JN0F"
    name="Casa de Lucía"
    ownerName="Lucía Martínez Soler"
    isDeleting
    onCancel={noop}
    onConfirm={noop}
  />
);
