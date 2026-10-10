import { useEffect, useRef } from "react";
import { LoadingAppAccordion, LoadingStat, Mui } from "conluz-web";

export const Collapsed = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <LoadingAppAccordion>
      <LoadingStat label="CUPS:" />
    </LoadingAppAccordion>
  </Mui.Box>
);

export const Expanded = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(".MuiAccordionSummary-root")?.click();
  }, []);
  return (
    <Mui.Box ref={ref} sx={{ maxWidth: 420 }}>
      <LoadingAppAccordion>
        <Mui.Box sx={{ display: "grid", gap: 1 }}>
          <LoadingStat label="CUPS:" />
          <LoadingStat label="Dirección:" />
          <LoadingStat label="Coeficiente de reparto:" />
        </Mui.Box>
      </LoadingAppAccordion>
    </Mui.Box>
  );
};
