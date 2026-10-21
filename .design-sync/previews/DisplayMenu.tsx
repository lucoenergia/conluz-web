import { useEffect, useRef } from "react";
import { DisplayMenu, Mui } from "conluz-web";

const noop = () => {};

const OpenOnBanner = ({ enabled, canDelete = false }: { enabled: boolean; canDelete?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.click();
  }, []);
  return (
    <Mui.Box sx={{ minHeight: 300 }}>
      <Mui.Box
        ref={ref}
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "primary.main", color: "white", px: 3, py: 1.5, borderRadius: 2 }}
      >
        <Mui.Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {enabled ? "Casa de Lucía" : "Local de la asociación"}
        </Mui.Typography>
        <DisplayMenu
          supplyPointId="sup-1"
          enabled={enabled}
          canEdit
          disableSupplyPoint={noop}
          enableSupplyPoint={noop}
          deleteSupplyPoint={canDelete ? noop : undefined}
        />
      </Mui.Box>
    </Mui.Box>
  );
};

export const EnabledSupply = () => <OpenOnBanner enabled />;

export const DisabledSupply = () => <OpenOnBanner enabled={false} />;

export const DeletableSupply = () => <OpenOnBanner enabled canDelete />;
