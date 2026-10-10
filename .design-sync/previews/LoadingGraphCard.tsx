import { LoadingGraphCard, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ maxWidth: 520 }}>
    <LoadingGraphCard />
  </Mui.Box>
);

export const PairWhileLoading = () => (
  <Mui.Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 520 }}>
    <LoadingGraphCard />
    <LoadingGraphCard />
  </Mui.Box>
);
