import { useEffect, useRef } from "react";
import { AppAccordion, Stat, Mui } from "conluz-web";

/** Opens the accordion once mounted — it is uncontrolled and starts collapsed. */
const useOpenOnMount = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const summary = ref.current?.querySelector<HTMLElement>(".MuiAccordionSummary-root");
    summary?.click();
  }, []);
  return ref;
};

export const Collapsed = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <AppAccordion title="Casa de Lucía">
      <Stat label="CUPS:" value="ES0031406912345678JN0F" />
    </AppAccordion>
  </Mui.Box>
);

export const Expanded = () => {
  const ref = useOpenOnMount();
  return (
    <Mui.Box ref={ref} sx={{ maxWidth: 420 }}>
      <AppAccordion title="Casa de Lucía">
        <Mui.Box sx={{ display: "grid", gap: 1 }}>
          <Stat label="CUPS:" value="ES0031406912345678JN0F" />
          <Stat label="Dirección:" value="Calle del Sol 14, 46900 Torrent, Valencia" />
          <Stat label="Coeficiente de reparto:" value="2,4500%" />
        </Mui.Box>
      </AppAccordion>
    </Mui.Box>
  );
};

export const Stacked = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <AppAccordion title="Casa de Lucía">
      <Stat label="CUPS:" value="ES0031406912345678JN0F" />
    </AppAccordion>
    <AppAccordion title="Panadería Martínez">
      <Stat label="CUPS:" value="ES0031406900011122ZX9B" />
    </AppAccordion>
    <AppAccordion title="Local de la asociación">
      <Stat label="CUPS:" value="ES0031406987654321QW1A" />
    </AppAccordion>
  </Mui.Box>
);
