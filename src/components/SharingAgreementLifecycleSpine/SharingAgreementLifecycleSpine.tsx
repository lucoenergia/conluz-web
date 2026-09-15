import { Fragment, useId, useState, type FC } from "react";
import { Box, Button, Collapse, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import CheckIcon from "@mui/icons-material/Check";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { alphas, colors, fontSizes, radii } from "../../theme/tokens";
import {
  EXTERNAL_STAGE,
  type LifecycleStageView,
  type LifecycleView,
  type StageState,
} from "../../pages/production/sharingAgreementLifecycle";

export interface SharingAgreementLifecycleSpineProps {
  view: LifecycleView;
}

type SpanPosition = "start" | "middle" | "end";

const STATE_LABELS: Record<StageState, string> = {
  done: "completado",
  current: "paso actual",
  pending: "pendiente",
  unverifiable: "fuera de Conluz, no verificable",
  closed: "cerrado",
};

const MARKER_SIZE = { xs: 26, sm: 30 };

/**
 * The rail sits in an inset well on the next-step banner, so every tone here is
 * measured against `brand.panel` rather than against paper: white and
 * `brand.onSoft` for type, translucent white for the structure.
 */
function markerSx(state: StageState) {
  const base = {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: fontSizes.sm,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    bgcolor: "transparent",
    border: "1px solid",
    borderColor: alphas.white.cloud,
    color: colors.brand.onSoft,
  };

  switch (state) {
    case "done":
      return {
        ...base,
        bgcolor: colors.brand.contrastText,
        borderColor: colors.brand.contrastText,
        color: colors.brand.panel,
      };
    case "current":
      return {
        ...base,
        bgcolor: colors.brand.contrastText,
        borderColor: colors.brand.contrastText,
        color: colors.brand.panel,
        // A ring rather than a shadow: it follows the border radius, needs no
        // hand-written shadow string, and survives forced-colours mode.
        outline: "3px solid",
        outlineColor: alphas.white.cloud,
      };
    case "unverifiable":
      return { ...base, borderStyle: "dashed", borderColor: alphas.white.heavy };
    case "closed":
      return { ...base, bgcolor: alphas.white.subtle };
    default:
      return base;
  }
}

const StageMarker: FC<{ stage: LifecycleStageView; isLast: boolean; spanPosition?: SpanPosition }> = ({
  stage,
  isLast,
  spanPosition,
}) => (
  <Box
    component="li"
    aria-current={stage.state === "current" ? "step" : undefined}
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 0.75,
      // Every stage takes an equal share. Sizing the first one to its content
      // instead collapses it to the width of its numeral, and its label then
      // overruns the next stage's.
      flex: 1,
      minWidth: 0,
      py: 0.5,
      ...(spanPosition && { bgcolor: alphas.white.subtle }),
      ...(spanPosition === "start" && {
        pl: 0.75,
        borderTopLeftRadius: radii.large,
        borderBottomLeftRadius: radii.large,
      }),
      ...(spanPosition === "end" && {
        pr: 0.75,
        borderTopRightRadius: radii.large,
        borderBottomRightRadius: radii.large,
      }),
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Box aria-hidden sx={markerSx(stage.state)}>
        {stage.state === "done" ? <CheckIcon sx={{ fontSize: 16 }} /> : null}
        {stage.state === "unverifiable" ? <MailOutlineIcon sx={{ fontSize: 14 }} /> : null}
        {stage.state !== "done" && stage.state !== "unverifiable" ? stage.number : null}
      </Box>
      {/* The connector trails its own marker and runs to the next one, so the
          five items join into one continuous rail. The last stage has nothing
          to join to, and keeps the space only so every item stays the same width. */}
      <Box
        aria-hidden
        sx={{
          flex: 1,
          height: "1px",
          mx: { xs: 0.5, sm: 1 },
          bgcolor: isLast
            ? "transparent"
            : stage.state === "done" || stage.state === "closed"
              ? alphas.white.heavy
              : alphas.white.cloud,
        }}
      />
    </Box>
    {/* Named only where there is room for it. On 390px the numerals plus the
        caption below carry the position; five truncated labels would not. */}
    <Typography
      aria-hidden
      sx={{
        display: { xs: "none", sm: "block" },
        pr: 1,
        fontSize: fontSizes.sm,
        lineHeight: 1.3,
        color: colors.brand.onSoft,
        fontWeight: stage.state === "current" ? 600 : 400,
      }}
    >
      {stage.shortTitle}
    </Typography>
    <Box component="span" sx={visuallyHidden}>
      {`Paso ${stage.number}: ${stage.title} — ${STATE_LABELS[stage.state]}`}
    </Box>
  </Box>
);

const StageList: FC<{ stages: LifecycleStageView[] }> = ({ stages }) => (
  <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
    {stages.map((stage) => {
      const isExternal = stage.number === EXTERNAL_STAGE;
      return (
        <Box component="li" key={stage.number}>
          <Typography
            variant="body2"
            fontWeight={stage.state === "current" ? 700 : 600}
            sx={{
              color: isExternal ? colors.brand.onSoft : colors.brand.contrastText,
              fontStyle: isExternal ? "italic" : "normal",
            }}
          >
            {stage.number}. {stage.title}
            {isExternal ? " (fuera de Conluz)" : ""}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.brand.onSoft }}>
            {stage.description}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

/**
 * The five-stage rail: where the agreement sits in its regulatory cycle, and
 * nothing else. The sentence describing the current step and the control that
 * performs it live in the next-step banner above — they were here once, and
 * having both meant the same instruction was printed twice on one screen.
 */
export const SharingAgreementLifecycleSpine: FC<SharingAgreementLifecycleSpineProps> = ({ view }) => {
  const [areStepsOpen, setAreStepsOpen] = useState(false);
  const stepsId = useId();
  const { stages, isSpanActive, railCaption } = view;

  const spanPositionFor = (stage: LifecycleStageView): SpanPosition | undefined => {
    if (!isSpanActive || stage.number === 1 || stage.number === 5) return undefined;
    if (stage.number === 2) return "start";
    if (stage.number === 4) return "end";
    return "middle";
  };

  return (
    <Box
      sx={{
        bgcolor: colors.brand.panel,
        borderRadius: radii.default,
        p: { xs: 1.25, sm: 2 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 0.75, sm: 1.5 },
      }}
    >
      <Box
        component="ol"
        aria-label="Ciclo del acuerdo de reparto"
        sx={{ listStyle: "none", display: "flex", alignItems: "flex-start", m: 0, p: 0 }}
      >
        {stages.map((stage, index) => (
          <Fragment key={stage.number}>
            <StageMarker
              stage={stage}
              isLast={index === stages.length - 1}
              spanPosition={spanPositionFor(stage)}
            />
          </Fragment>
        ))}
      </Box>

      {railCaption && (
        <Typography sx={{ fontSize: { xs: fontSizes.md, sm: fontSizes.lg }, lineHeight: 1.4, color: colors.brand.onSoft }}>
          {railCaption}
        </Typography>
      )}

      <Box>
        <Button
          variant="text"
          size="small"
          onClick={() => setAreStepsOpen((open) => !open)}
          aria-expanded={areStepsOpen}
          aria-controls={stepsId}
          endIcon={
            <ExpandMoreIcon
              sx={{ transform: areStepsOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease-out" }}
            />
          }
          sx={{
            color: colors.brand.contrastText,
            px: 0.5,
            textDecoration: "underline",
            "&:hover": { bgcolor: alphas.white.subtle, textDecoration: "underline" },
          }}
        >
          {areStepsOpen ? "Ocultar los pasos" : "Ver todos los pasos"}
        </Button>
        {/* Stays mounted while collapsed: the stage descriptions are the rail's
            explanation of itself, and they belong to the page whether or not the
            disclosure happens to be open. */}
        <Collapse in={areStepsOpen}>
          <Box
            id={stepsId}
            sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: alphas.white.cloud }}
          >
            <StageList stages={stages} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};
