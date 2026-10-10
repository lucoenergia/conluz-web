import { useState } from "react";
import { FilterChipsBar } from "conluz-web";

export const All = () => {
  const [v, setV] = useState<"all" | "active" | "inactive">("all");
  return <FilterChipsBar value={v} onChange={setV} />;
};

export const Active = () => {
  const [v, setV] = useState<"all" | "active" | "inactive">("active");
  return <FilterChipsBar value={v} onChange={setV} />;
};

export const Inactive = () => {
  const [v, setV] = useState<"all" | "active" | "inactive">("inactive");
  return <FilterChipsBar value={v} onChange={setV} />;
};

export const WithoutIcon = () => {
  const [v, setV] = useState<"all" | "active" | "inactive">("all");
  return <FilterChipsBar value={v} onChange={setV} showIcon={false} />;
};
