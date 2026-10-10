import { PaginatedList, Mui, Icons } from "conluz-web";

const members = [
  "Lucía Ferrer Puig", "Joan Martínez Soler", "Carmen Navarro Gil", "Vicent Ribes Climent",
  "Amparo Llopis Torres", "Pau Esteve Moll", "Marta Sanchis Bou", "Josep Alcover Mas",
  "Rosa Peris Ortí", "Andreu Giner Roig", "Elena Cervera Sanz", "Toni Bellver Monzó",
];

const Row = ({ name }: { name: string }) => (
  <Mui.ListItem sx={{ width: 380, borderBottom: 1, borderColor: "divider" }}>
    <Mui.ListItemIcon><Icons.PersonOutline /></Mui.ListItemIcon>
    <Mui.ListItemText primary={name} secondary="Miembro de la comunidad" />
  </Mui.ListItem>
);

export const ThreePages = () => (
  <PaginatedList>
    {members.map((m) => <Row key={m} name={m} />)}
  </PaginatedList>
);

export const SinglePage = () => (
  <PaginatedList>
    {members.slice(0, 3).map((m) => <Row key={m} name={m} />)}
  </PaginatedList>
);
