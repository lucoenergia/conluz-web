import { ContactChannelReorderList, Mui } from "conluz-web";

const noop = () => {};

const CHANNELS = [
  { type: "EMAIL" as const, label: "Tesorería", value: "tesoreria@solsierra.example", schedule: null, notes: null },
  { type: "PHONE" as const, label: "Oficina", value: "+34 978 710 251", schedule: "Lunes a viernes, de 10:00 a 13:00", notes: null },
  { type: "ADDRESS" as const, label: "Local de la asociación", value: "Calle Mayor 12, bajo, 44100 Albarracín (Teruel)", schedule: null, notes: null },
];

const handlers = { onSave: noop, onCancel: noop, onLostRightsClose: noop };

export const OrderMode = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <ContactChannelReorderList channels={CHANNELS} {...handlers} />
  </Mui.Box>
);

export const SavingOrder = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <ContactChannelReorderList channels={CHANNELS} status="saving" {...handlers} />
  </Mui.Box>
);

export const OrderNotSaved = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <ContactChannelReorderList channels={CHANNELS} status="failed" {...handlers} />
  </Mui.Box>
);
