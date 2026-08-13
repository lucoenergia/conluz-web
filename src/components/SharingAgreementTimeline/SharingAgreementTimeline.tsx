import type { FC } from "react";
import { Box, Fade, Grow } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { colors } from "../../theme/tokens";
import { SharingAgreementCard } from "../SharingAgreementCard";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse, SharingAgreementResponseStatus as StatusValue } from "../../api/models";

export interface SharingAgreementTimelineProps {
  plantId: string;
  agreements: SharingAgreementResponse[];
}

const RAIL_WIDTH = 32;
const RING_SIZE = 32;
const DOT_SIZE = 16;
const RAIL_TOP_OFFSET = "26px";

interface TimelineDotProps {
  status: StatusValue | undefined;
}

const TimelineDot: FC<TimelineDotProps> = ({ status }) => {
  const theme = useTheme();

  if (status === SharingAgreementResponseStatus.DRAFT) {
    return (
      <Box
        data-testid="sharing-agreement-timeline-dot"
        sx={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: "50%",
          border: `2px dashed ${theme.palette.warning.main}`,
          flexShrink: 0,
        }}
      />
    );
  }

  const isPublished = status === SharingAgreementResponseStatus.PUBLISHED;
  const dotColor = isPublished ? theme.palette.primary.main : colors.text.muted;
  const ringColor = isPublished
    ? alpha(theme.palette.primary.main, 0.15)
    : alpha(theme.palette.text.secondary, 0.12);

  return (
    <Box
      data-testid="sharing-agreement-timeline-dot"
      sx={{
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: "50%",
        bgcolor: ringColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Box sx={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: "50%", bgcolor: dotColor }} />
    </Box>
  );
};

export const SharingAgreementTimeline: FC<SharingAgreementTimelineProps> = ({ plantId, agreements }) => (
  <Fade in timeout={500}>
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {agreements.map((agreement, index) => {
        const isLast = index === agreements.length - 1;
        return (
          <Grow in timeout={300 + index * 50} key={agreement.id || index}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box
                sx={{
                  width: RAIL_WIDTH,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  pt: RAIL_TOP_OFFSET,
                  flexShrink: 0,
                }}
              >
                <TimelineDot status={agreement.status} />
                {!isLast && (
                  <Box
                    data-testid="sharing-agreement-timeline-connector"
                    sx={{ flex: 1, width: "2px", bgcolor: colors.divider, my: 1 }}
                  />
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 3 }}>
                <SharingAgreementCard plantId={plantId} agreement={agreement} />
              </Box>
            </Box>
          </Grow>
        );
      })}
    </Box>
  </Fade>
);
