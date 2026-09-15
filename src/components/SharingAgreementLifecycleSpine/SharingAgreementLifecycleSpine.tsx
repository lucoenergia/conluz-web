import { Fragment, useId, useState, type FC } from "react";
import { Box, Button, Collapse, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import CheckIcon from "@mui/icons-material/Check";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { colors, fontSizes, radii } from "../../theme/tokens";
import {
  SharingAgreementActionButton,
  type SharingAgreementActionDescriptor,
} from "../SharingAgreementActionButton";
import { EXTERNAL_STAGE, type LifecycleStageView, type LifecycleView, type StageState } from "../../pages/production/sharingAgreementLifecycle";

/** An action the rail can offer. Same shape, and same gating contract, as every other gated control. */
export type LifecycleSpineAction = SharingAgreementActionDescriptor;

export interface SharingAgreementLifecycleSpineProps {
  view: LifecycleView;
  /** Stage 2. */
  generate?: LifecycleSpineAction;
  /** Stage 4's forward move. */
  publish?: LifecycleSpineAction;
  /** The reverse move off stage 4 — not a stage of its own. */
  revert?: LifecycleSpineAction;
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
    bgcolor: colors.background.paper,
    border: "1px solid",
    borderColor: colors.border.light,
    color: colors.text.muted,
  };

  switch (state) {
    case "done":
      return { ...base, bgcolor: colors.brand.surface, borderColor: colors.brand.surface, color: colors.brand.main };
    case "current":
      return { ...base, bgcolor: colors.brand.main, borderColor: colors.brand.main, color: colors.brand.contrastText };
    case "unverifiable":
      return { ...base, borderStyle: "dashed" };
    case "closed":
      return { ...base, bgcolor: colors.background.surface };
    default:
      return base;
  }
}

const StageMarker: FC<{ stage: LifecycleStageView; isFirst: boolean; spanPosition?: SpanPosition }> = ({
  stage,
  isFirst,
  spanPosition,
}) => (
  <Box
    component="li"
    aria-current={stage.state === "current" ? "step" : undefined}
    sx={{
      display: "flex",
      alignItems: "center",
      // Only items that carry a leading connector may stretch. The first marker
      // has none, so an equal share would leave a gap twice the size of the rest.
      flex: isFirst ? "0 0 auto" : 1,
      minWidth: 0,
      py: 0.5,
      ...(spanPosition && { bgcolor: colors.brand.surface }),
      ...(spanPosition === "start" && { pl: 0.75, borderTopLeftRadius: radii.large, borderBottomLeftRadius: radii.large }),
      ...(spanPosition === "end" && { pr: 0.75, borderTopRightRadius: radii.large, borderBottomRightRadius: radii.large }),
      // The connector belongs to the gap before a marker, so it inherits the
      // span's tint and the band reads as one continuous phase.
      ...(!isFirst && {
        "&::before": {
          content: '""',
          flex: 1,
          height: "1px",
          bgcolor: colors.border.light,
          mx: { xs: 0.5, sm: 1 },
        },
      }),
    }}
  >
    <Box aria-hidden sx={markerSx(stage.state)}>
      {stage.state === "done" ? <CheckIcon sx={{ fontSize: 16 }} /> : null}
      {stage.state === "unverifiable" ? <MailOutlineIcon sx={{ fontSize: 14 }} /> : null}
      {stage.state !== "done" && stage.state !== "unverifiable" ? stage.number : null}
    </Box>
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
              color: isExternal ? colors.text.subtle : colors.text.primary,
              fontStyle: isExternal ? "italic" : "normal",
            }}
          >
            {stage.number}. {stage.title}
            {isExternal ? " (fuera de Conluz)" : ""}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
            {stage.description}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

export const SharingAgreementLifecycleSpine: FC<SharingAgreementLifecycleSpineProps> = ({
  view,
  generate,
  publish,
  revert,
}) => {
  const [areStepsOpen, setAreStepsOpen] = useState(false);
  const stepsId = useId();
  const { stages, isSpanActive, current, completionNote } = view;

  const spanPositionFor = (stage: LifecycleStageView): SpanPosition | undefined => {
    if (!isSpanActive || stage.number === 1 || stage.number === 5) return undefined;
    if (stage.number === 2) return "start";
    if (stage.number === 4) return "end";
    return "middle";
  };

  const actions = [
    generate ? { action: generate, emphasis: "secondary" as const, key: "generate" } : null,
    publish ? { action: publish, emphasis: "primary" as const, key: "publish" } : null,
    revert ? { action: revert, emphasis: "quiet" as const, key: "revert" } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  // A blocked action states its own reason beneath its button. When that is the
  // same sentence as the stage requirement — a missing CAU blocking stage 2, for
  // instance — printing both would repeat one fact twice on one screen.
  const actionReasons = new Set(
    actions.map(({ action }) => action.disabledReason).filter((reason): reason is string => !!reason),
  );
  const stageRequirement =
    current?.requirement && !actionReasons.has(current.requirement) ? current.requirement : undefined;

  return (
    <Box>
      <Box
        component="ol"
        aria-label="Ciclo del acuerdo de reparto"
        sx={{ listStyle: "none", display: "flex", alignItems: "center", m: 0, p: 0 }}
      >
        {stages.map((stage, index) => (
          <Fragment key={stage.number}>
            <StageMarker stage={stage} isFirst={index === 0} spanPosition={spanPositionFor(stage)} />
          </Fragment>
        ))}
      </Box>

      {current && (
        <Box sx={{ mt: 2.25 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: colors.text.primary }}>
            {current.title}
          </Typography>
          {current.body && (
            <Typography variant="body2" sx={{ mt: 0.5, color: colors.text.subtle, maxWidth: "68ch" }}>
              {current.body}
            </Typography>
          )}
          {stageRequirement && (
            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.75, color: colors.text.body }}>
              {stageRequirement}
            </Typography>
          )}
          {current.secondaryLine && (
            <Typography variant="body2" sx={{ mt: 0.5, color: colors.text.subtle, maxWidth: "68ch" }}>
              {current.secondaryLine}
            </Typography>
          )}
        </Box>
      )}

      {completionNote && (
        <Typography variant="body2" sx={{ mt: 2.25, color: colors.text.subtle }}>
          {completionNote}
        </Typography>
      )}

      {actions.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "flex-start",
            mt: 2,
            pt: 2,
            // The action belongs to the step stated above it. A footer rule ties
            // it to the card instead of leaving it floating in its own column.
            borderTop: "1px solid",
            borderColor: colors.divider,
          }}
        >
          {actions.map(({ action, emphasis, key }) => (
            <SharingAgreementActionButton key={key} action={action} emphasis={emphasis} />
          ))}
        </Box>
      )}

      <Box sx={{ mt: 1 }}>
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
          sx={{ color: colors.text.subtle, px: 0.5, "&:hover": { color: colors.brand.main } }}
        >
          Ver todos los pasos
        </Button>
        {/* Stays mounted while collapsed: the stage descriptions are the rail's
            explanation of itself, and they belong to the page whether or not the
            disclosure happens to be open. */}
        <Collapse in={areStepsOpen}>
          <Box id={stepsId} sx={{ mt: 1.5 }}>
            <StageList stages={stages} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};
