import { useEffect, useRef } from "react";
import { DisplayMenu, Mui } from "conluz-web";

const noop = () => {};

const OpenOnBanner = ({ enabled }: { enabled: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.click();
  }, []);
  return (
    <Mui.Box sx={{ minHeight: 260 }}>
      <Mui.Box
        ref={ref}
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "primary.main", color: "white", px: 3, py: 1.5, borderRadius: 2 }}
      >
        <Mui.Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {enabled ? "Casa de Lucía" : "Local de la asociación"}
        </Mui.Typography>
        <DisplayMenu supplyPointId="sup-1" enabled={enabled} disableSupplyPoint={noop} enableSupplyPoint={noop} />
      </Mui.Box>
    </Mui.Box>
  );
};

export const EnabledSupply = () => <OpenOnBanner enabled />;

export const DisabledSupply = () => <OpenOnBanner enabled={false} />;
