import { PlantCard, Mui } from "conluz-web";

const ok = async () => true;

export const Manageable = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <PlantCard
      id="plant-1"
      code="ES0031406900011122ZX9B1F"
      name="Planta Polideportivo"
      address="Calle del Polideportivo 3, 46900 Torrent, Valencia"
      totalPower={45.6}
      connectionDate="2024-03-12"
      description="Cubierta fotovoltaica del polideportivo municipal, 112 módulos de 410 W."
      canManage
      canListSharingAgreements
      onDelete={ok}
    />
  </Mui.Box>
);

export const ReadOnly = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <PlantCard
      id="plant-2"
      code="ES0031406987654321QW1A1F"
      name="Planta CEIP Lluís Vives"
      address="Avinguda de l'Albereda 21, 46900 Torrent, Valencia"
      totalPower={22.4}
      connectionDate="2024-09-01"
    />
  </Mui.Box>
);

export const MissingData = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <PlantCard id="plant-3" code="ES0031406955500011AB2C1F" canListSharingAgreements />
  </Mui.Box>
);
