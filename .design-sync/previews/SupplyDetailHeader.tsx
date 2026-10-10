import { useEffect, useRef } from "react";
import { SupplyDetailHeader, Mui } from "conluz-web";

const supply = {
  id: "sup-1",
  code: "ES0031406912345678JN0F",
  user: { id: "user-1", fullName: "Lucía Ferrer Puig" },
  name: "Casa de Lucía",
  address: "Calle del Sol 14, 46900 Torrent, Valencia",
  addressRef: "9872023VH5797S0001WX",
  enabled: true,
  community: { id: "com-1", name: "Comunidad Energética de Torrent" },
  capabilities: {},
} as any;

export const Active = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <SupplyDetailHeader supplyPoint={supply} />
  </Mui.Box>
);

export const Inactive = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <SupplyDetailHeader
      supplyPoint={{ ...supply, id: "sup-2", code: "ES0031406987654321QW1A", name: null, addressRef: null, user: null, enabled: false, address: "Plaza Mayor 2, 46900 Torrent, Valencia" }}
    />
  </Mui.Box>
);

/** Loading and error render the same shell (title fallback, no facts); the page shows the spinner or alert around it. */
export const LoadingOrFailed = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <SupplyDetailHeader isLoading />
  </Mui.Box>
);

export const DetailsExpanded = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button[aria-expanded='false']")?.click();
  }, []);
  return (
    <Mui.Box ref={ref} sx={{ width: "100%" }}>
      <SupplyDetailHeader supplyPoint={supply} />
    </Mui.Box>
  );
};
