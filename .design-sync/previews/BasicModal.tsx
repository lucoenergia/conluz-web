import { BasicModal, Mui } from "conluz-web";

export const Open = () => (
  <BasicModal isOpen onClose={() => {}} labelledBy="basic-modal-title">
    <Mui.Box sx={{ p: 3 }}>
      <Mui.Typography id="basic-modal-title" variant="h6" component="h2" sx={{ mb: 1 }}>
        Planta Polideportivo
      </Mui.Typography>
      <Mui.Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
        Potencia instalada de 45,6 kW repartida entre 38 puntos de suministro de la comunidad.
      </Mui.Typography>
    </Mui.Box>
  </BasicModal>
);
