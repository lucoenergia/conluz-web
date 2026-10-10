import { CapabilityLoadError, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <CapabilityLoadError onRetry={() => {}} />
  </Mui.Box>
);

export const Narrow = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <CapabilityLoadError onRetry={() => {}} />
  </Mui.Box>
);
