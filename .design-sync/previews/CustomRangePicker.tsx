import { useState } from "react";
import { CustomRangePicker, Mui } from "conluz-web";

const MONTH_ANCHOR = { kind: "month", month: { year: 2026, month: 9 } } as const;

/** Opened from the period selector: a popover anchored under it, two months side by side. */
export const Popover = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return (
    <Mui.Box sx={{ width: "100%" }}>
      <Mui.Box ref={setAnchorEl} sx={{ width: 320, height: 40, border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, display: "flex", alignItems: "center" }}>
        <Mui.Typography variant="body2">Rango personalizado</Mui.Typography>
      </Mui.Box>
      <CustomRangePicker
        open={anchorEl !== null}
        anchor={MONTH_ANCHOR}
        current={{ kind: "custom", from: { year: 2026, month: 7, day: 1 }, to: { year: 2026, month: 8, day: 15 } }}
        variant="popover"
        anchorEl={anchorEl}
        onClose={() => {}}
        onApply={() => {}}
      />
    </Mui.Box>
  );
};
