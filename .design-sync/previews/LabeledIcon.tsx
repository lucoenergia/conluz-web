import { LabeledIcon, Mui, Icons } from "conluz-web";

export const IconLeft = () => <LabeledIcon label="Mi perfil" icon={Icons.Person} />;

export const IconRight = () => (
  <Mui.Box sx={{ width: 280 }}>
    <LabeledIcon label="Ver detalle" icon={Icons.ChevronRight} iconPosition="right" />
  </Mui.Box>
);

export const SpaceBetween = () => (
  <Mui.Box sx={{ width: 320 }}>
    <LabeledIcon label="Soporte técnico" icon={Icons.HeadsetMic} iconPosition="right" justify="between" />
  </Mui.Box>
);

export const SupportCardHeading = () => <LabeledIcon label="Contacto por correo" icon={Icons.Email} labelSize="1.5rem" />;

export const Compact = () => (
  <Mui.Stack spacing={0.5}>
    <LabeledIcon label="Calle del Sol 14, Torrent" icon={Icons.LocationOn} variant="compact" labelSize="0.875rem" />
    <LabeledIcon label="45,6 kW instalados" icon={Icons.Bolt} variant="compact" labelSize="0.875rem" />
    <LabeledIcon label="Conectada el 12 mar 2024" icon={Icons.CalendarToday} variant="compact" labelSize="0.875rem" />
  </Mui.Stack>
);
