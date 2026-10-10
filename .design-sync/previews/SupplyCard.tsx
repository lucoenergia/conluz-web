import { SupplyCard, Mui } from "conluz-web";

const ok = async () => true;

export const Active = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <SupplyCard
      id="sup-1"
      code="ES0031406912345678JN0F"
      name="Casa de Lucía"
      address="Calle del Sol 14, 46900 Torrent, Valencia"
      enabled
      lastConnection="Hace 2 horas"
      lastMeasurement={37}
    />
  </Mui.Box>
);

export const Inactive = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <SupplyCard
      id="sup-2"
      code="ES0031406987654321QW1A"
      name="Local de la asociación"
      address="Plaza Mayor 2, 46900 Torrent, Valencia"
      enabled={false}
      lastConnection="Hace 6 días"
      lastMeasurement={0}
    />
  </Mui.Box>
);

export const Editable = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <SupplyCard
      id="sup-3"
      code="ES0031406900011122ZX9B"
      name="Panadería Martínez"
      address="Avenida del Mediterráneo 88, 46900 Torrent, Valencia"
      enabled
      lastConnection="Hace 15 minutos"
      lastMeasurement={84}
      canEdit
      onDisable={ok}
      onEnable={ok}
    />
  </Mui.Box>
);
