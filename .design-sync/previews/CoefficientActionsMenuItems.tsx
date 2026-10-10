import { useState } from "react";
import { CoefficientActionsMenuItems, RowActionsMenu, Mui, Icons } from "conluz-web";

type Item = { action: "apply" | "correct" | "deactivate" | "close" | "reopen"; disabledReason?: string };

const OpenMenu = ({ items, trigger }: { items: Item[]; trigger: "kebab" | "batch" }) => {
  // Callback ref: the menu opens in the same commit as the trigger mounts.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // The batch menu is ~270px tall: keep its trigger near the top so it opens below the
  // button inside the 360px card instead of being shifted up over it.
  return (
    <Mui.Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", pr: 4, pt: trigger === "batch" ? 1 : 6, minHeight: 300 }}>
      {trigger === "kebab" ? (
        <Mui.IconButton ref={setAnchor} aria-label="Acciones para Casa de Lucía" onClick={(e) => setAnchor(e.currentTarget)}>
          <Icons.MoreVert />
        </Mui.IconButton>
      ) : (
        <Mui.Button ref={setAnchor} variant="contained" onClick={(e) => setAnchor(e.currentTarget)}>
          Acciones
        </Mui.Button>
      )}
      <RowActionsMenu anchorEl={anchor} onClose={() => setAnchor(null)}>
        <CoefficientActionsMenuItems items={items} onSelectAction={() => setAnchor(null)} />
      </RowActionsMenu>
    </Mui.Box>
  );
};

/** Row menu of an applied, in-force coefficient: date group, divider, lifecycle group. */
export const AppliedRow = () => (
  <OpenMenu trigger="kebab" items={[{ action: "correct" }, { action: "deactivate" }, { action: "close" }]} />
);

/** A pending row offers only "Registrar fecha": a single group, no divider. */
export const PendingRow = () => <OpenMenu trigger="kebab" items={[{ action: "apply" }]} />;

/** A closed coefficient can be reopened. */
export const ClosedRow = () => <OpenMenu trigger="kebab" items={[{ action: "correct" }, { action: "reopen" }]} />;

/** Batch bar menu: items only partly applicable across the selection stay reachable, with their reason. */
export const BatchWithPartialAvailability = () => (
  <OpenMenu
    trigger="batch"
    items={[
      { action: "apply", disabledReason: "Solo aplicable a 2 de 5 seleccionados" },
      { action: "correct" },
      { action: "deactivate" },
      { action: "close", disabledReason: "Solo aplicable a 3 de 5 seleccionados" },
    ]}
  />
);
