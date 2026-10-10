import { TagComponent, Mui } from "conluz-web";

export const Single = () => <TagComponent label="Autoconsumo colectivo" />;

export const TagRow = () => (
  <Mui.Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", maxWidth: 420 }}>
    <TagComponent label="Torrent" />
    <TagComponent label="Fotovoltaica" />
    <TagComponent label="45,6 kW" />
    <TagComponent label="Tarifa 2.0TD" />
  </Mui.Box>
);
