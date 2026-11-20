import { Mui, PairedTerm } from "conluz-web";

export const Inline = () => (
  <Mui.Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Mui.Typography variant="body2">
      <PairedTerm term="De la comunidad" technical="autoconsumo" />
    </Mui.Typography>
    <Mui.Typography variant="body2">
      <PairedTerm term="Se fue a la red" technical="excedentes" />
    </Mui.Typography>
    <Mui.Typography variant="body2">
      <PairedTerm term="De la red" />
    </Mui.Typography>
  </Mui.Box>
);

/** As a column header of the period's data table: the technical term and the unit on lines of their own. */
export const Stacked = () => (
  <Mui.Box sx={{ display: "flex", gap: 4 }}>
    <Mui.Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
      <PairedTerm term="De la comunidad" technical="autoconsumo" unit="kWh" stacked />
    </Mui.Typography>
    <Mui.Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
      <PairedTerm term="De la red" unit="kWh" stacked />
    </Mui.Typography>
  </Mui.Box>
);
