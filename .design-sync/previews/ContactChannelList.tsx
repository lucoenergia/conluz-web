import { ContactChannelList, Mui } from "conluz-web";

export const MixedChannels = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <ContactChannelList
      channels={[
        { type: "PHONE", label: "Atención a socios", value: "+34 600 111 222", schedule: "Lunes a viernes, de 9:00 a 14:00", notes: null },
        { type: "EMAIL", label: "Correo de la comunidad", value: "hola@solcomun.example", schedule: null, notes: "Respondemos en un plazo de 48 horas." },
        { type: "ADDRESS", label: "Oficina", value: "Carrer de la Pau 12, 46002 València", schedule: "Jueves, de 17:00 a 19:00", notes: null },
      ]}
    />
  </Mui.Box>
);

export const PhoneWithScheduleAndNotes = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <ContactChannelList
      channels={[
        {
          type: "PHONE",
          label: "Incidencias",
          value: "600 333 444",
          schedule: "Todos los días, de 8:00 a 20:00",
          notes: "Solo para cortes o lecturas que no llegan.",
        },
      ]}
    />
  </Mui.Box>
);

export const AddressOnly = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <ContactChannelList
      channels={[{ type: "ADDRESS", label: "Local social", value: "Plaça Major 3, 46900 Torrent", schedule: null, notes: null }]}
    />
  </Mui.Box>
);
