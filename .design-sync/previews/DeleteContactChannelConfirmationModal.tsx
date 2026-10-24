import { DeleteContactChannelConfirmationModal } from "conluz-web";

const noop = () => {};

export const Open = () => (
  <DeleteContactChannelConfirmationModal isOpen label="Oficina" otherCount={2} onCancel={noop} onConfirm={noop} />
);

export const LastChannel = () => (
  <DeleteContactChannelConfirmationModal isOpen label="Oficina" otherCount={0} onCancel={noop} onConfirm={noop} />
);
