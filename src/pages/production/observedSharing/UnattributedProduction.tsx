import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { UnallocatedShareResponse } from "../../../api/models";
import { colors } from "../../../theme/tokens";
import {
  formatPercentageOrNone,
  isImpossibleUnattributedShare,
  unattributedRemainder,
  type UnattributedRemainderKind,
} from "./observedSharingFormat";

const IMPOSSIBLE_SHARE_WARNING =
  "Imposible: los puntos reciben más energía de la que produce la planta. Algún dato de Datadis es erróneo; revisa las anomalías con β observada muy alta.";

const REMAINDER_MEANING: Record<UnattributedRemainderKind, string> = {
  receivedMore: "Los puntos con datos recibieron más de lo registrado.",
  notDelivered: "Producción que no llegó a ningún punto registrado.",
  rounding: "Dentro del margen de redondeo.",
};

const explanation = (days: number) =>
  `Parte de la producción de la planta que, según Datadis, no llegó a ningún punto con datos durante la aplicación de este acuerdo (${days} ${days === 1 ? "día medible" : "días medibles"}).`;

const lineSx = { color: colors.text.subtle, fontWeight: 400 } as const;

/**
 * "Producción no atribuida" as the analysis gave it (UI-AGR-040, UI-AGR-041):
 * the value, still shown when impossible but in the warning tone with why under
 * it (UI-AGR-039); then what it is, over how many measurable days, and what it
 * is made of: the registered share of the supplies without data those days,
 * when there is one, and the rest. "—" alone when the analysis gave none.
 */
export const UnattributedProduction: FC<{ share: UnallocatedShareResponse | null; variant: "body1" | "body2" }> = ({
  share,
  variant,
}) => {
  const unallocated = share?.unallocated;
  const impossible = isImpossibleUnattributedShare(unallocated);
  const remainder = share && unattributedRemainder(share);
  return (
    <>
      <Typography variant={variant} sx={{ fontWeight: 600 }}>
        <Box
          component="span"
          sx={{ fontVariantNumeric: "tabular-nums", ...(impossible && { color: colors.warning.main }) }}
        >
          {formatPercentageOrNone(unallocated, 1)}
        </Box>
      </Typography>
      {impossible && (
        <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 400 }}>
          {IMPOSSIBLE_SHARE_WARNING}
        </Typography>
      )}
      {share && remainder && (
        <>
          <Typography variant="body2" sx={lineSx}>
            {explanation(share.days)}
          </Typography>
          {share.registeredShareWithoutData > 0 && (
            <Typography variant="body2" sx={lineSx}>
              {`${formatPercentageOrNone(share.registeredShareWithoutData, 1)} corresponde a puntos que no tenían datos esos días`}
            </Typography>
          )}
          <Typography variant="body2" sx={lineSx}>
            {`Resto: ${remainder.text}. ${REMAINDER_MEANING[remainder.kind]}`}
          </Typography>
        </>
      )}
    </>
  );
};
