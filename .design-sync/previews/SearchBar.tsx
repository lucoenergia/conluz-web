import { useState } from "react";
import { SearchBar, FilterChipsBar, Mui } from "conluz-web";

export const Empty = () => {
  const [q, setQ] = useState("");
  return <SearchBar value={q} onChange={setQ} />;
};

export const WithQuery = () => {
  const [q, setQ] = useState("Torrent");
  return <SearchBar value={q} onChange={setQ} />;
};

export const CustomPlaceholder = () => {
  const [q, setQ] = useState("");
  return <SearchBar value={q} onChange={setQ} placeholder="Buscar miembro por nombre o email..." label="Buscar miembro" />;
};

export const WithFilters = () => {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "active" | "inactive">("active");
  return (
    <Mui.Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
      <SearchBar value={q} onChange={setQ} />
      <FilterChipsBar value={f} onChange={setF} />
    </Mui.Box>
  );
};
