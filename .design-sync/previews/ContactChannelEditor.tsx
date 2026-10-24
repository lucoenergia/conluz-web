import { ContactChannelEditor } from "conluz-web";

const noop = () => {};

const OFFICE = {
  type: "PHONE" as const,
  label: "Oficina",
  value: "+34 978 710 251",
  schedule: "Lunes a viernes, de 10:00 a 13:00",
  notes: "Si no contestamos, deja un mensaje y te llamamos.",
};

const BLANK = { type: "PHONE" as const, label: "", value: "", schedule: "", notes: "" };

const handlers = { onSave: noop, onDelete: noop, onClose: noop, onLostRightsClose: noop };

export const EditChannel = () => (
  <ContactChannelEditor open mode="edit" initialChannel={OFFICE} communityName="Comunidad Energética Sol de la Sierra" {...handlers} />
);

export const NewChannel = () => (
  <ContactChannelEditor open mode="add" initialChannel={BLANK} communityName="Comunidad Energética Sol de la Sierra" {...handlers} />
);

export const FieldErrors = () => (
  <ContactChannelEditor
    open
    mode="add"
    initialChannel={{ ...BLANK, value: "978 71" }}
    communityName="Comunidad Energética Sol de la Sierra"
    fieldErrors={{
      label: "Escribe un nombre para el canal, por ejemplo «Oficina».",
      value: "Escribe al menos 6 cifras. Solo números, espacios y un + al principio.",
    }}
    {...handlers}
  />
);

export const Saving = () => (
  <ContactChannelEditor open mode="edit" initialChannel={OFFICE} communityName="Comunidad Energética Sol de la Sierra" status="saving" {...handlers} />
);

export const ServerError = () => (
  <ContactChannelEditor open mode="edit" initialChannel={OFFICE} communityName="Comunidad Energética Sol de la Sierra" status="serverError" {...handlers} />
);

export const Offline = () => (
  <ContactChannelEditor open mode="edit" initialChannel={OFFICE} communityName="Comunidad Energética Sol de la Sierra" status="offline" {...handlers} />
);

export const LostRights = () => (
  <ContactChannelEditor open mode="edit" initialChannel={OFFICE} communityName="Comunidad Energética Sol de la Sierra" status="lostRights" {...handlers} />
);
