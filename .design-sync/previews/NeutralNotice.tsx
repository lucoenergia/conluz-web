import { Mui, NeutralNotice } from "conluz-web";

export const WithTitle = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <NeutralNotice title="Todavía no hay datos de tu energía">
      Aparecerán cuando la distribuidora publique el primer mes en que se te haya asignado energía de la comunidad. Los
      datos de cada mes se publican hacia el día 10 del mes siguiente.
    </NeutralNotice>
  </Mui.Box>
);

export const Plain = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <NeutralNotice>Faltan datos de parte de este periodo: las cifras suman solo los datos disponibles.</NeutralNotice>
  </Mui.Box>
);

export const PlantSupply = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <NeutralNotice>
      Cubierta del polideportivo es el punto de suministro de la planta Polideportivo Municipal: «se fue a la red» siempre es
      0 kWh.
    </NeutralNotice>
  </Mui.Box>
);
