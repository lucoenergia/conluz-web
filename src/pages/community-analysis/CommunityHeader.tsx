import type { FC } from "react";
import { Typography } from "@mui/material";
import type { CommunityEnergyMetricsResponse } from "../../api/models";
import { useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { colors } from "../../theme/tokens";
import { plantsSummary } from "./communityFigureTexts";


/**
 * Under the page title: the community's name, its plants and their installed
 * power, from the response the anchor came with -- none of it depends on the
 * period (#403). The name joins once the community list has loaded.
 */
export const CommunityHeader: FC<{ metrics: Pick<CommunityEnergyMetricsResponse, "plants" | "installedPowerKWp"> }> = ({ metrics }) => {
  const name = useActiveCommunityName();
  return (
    <Typography variant="body1" sx={{ color: colors.text.body, mt: 0.75 }}>
      {[name, plantsSummary(metrics)].filter(Boolean).join(" · ")}
    </Typography>
  );
};
