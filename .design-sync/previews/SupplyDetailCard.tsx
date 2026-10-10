import { SupplyDetailCard, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ width: 820 }}>
    <SupplyDetailCard
      name="Casa de Lucía"
      cups="ES0031406912345678JN0F"
      address="Calle del Sol 14, Torrent"
      partitionCoeficient={3.2541}
    />
  </Mui.Box>
);

export const NoCoefficient = () => (
  <Mui.Box sx={{ width: 820 }}>
    <SupplyDetailCard
      name="Local de la asociación"
      cups="ES0031406987654321QW1A"
      address="Plaza Mayor 2, Torrent"
    />
  </Mui.Box>
);
