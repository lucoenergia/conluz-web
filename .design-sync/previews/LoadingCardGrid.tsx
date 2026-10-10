import { LoadingCardGrid, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <LoadingCardGrid skeletonCount={6} columns={{ xs: 3, sm: 3, md: 3, lg: 3 }} />
  </Mui.Box>
);

export const TwoColumns = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <LoadingCardGrid skeletonCount={4} columns={{ xs: 2, sm: 2, md: 2, lg: 2 }} />
  </Mui.Box>
);

export const SingleColumn = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <LoadingCardGrid skeletonCount={2} columns={{ xs: 1, sm: 1, md: 1, lg: 1 }} />
  </Mui.Box>
);
