import type { FC } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { colors, radii } from "../../theme/tokens";
import { AppAccordion } from "../AppAccordion/AppAccordion";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";
import type { SharingAgreementNextStep } from "../../pages/production/selectSharingAgreementNextStep";

export interface SharingAgreementNextStepPanelProps {
  nextStep: SharingAgreementNextStep;
}

type StageNumber = 1 | 2 | 3 | 4 | 5;

const EXTERNAL_STAGE: StageNumber = 3;

const STAGES: ReadonlyArray<{ title: string; description: string }> = [
  { title: "Define el reparto", description: "Sube el TXT o introduce los coeficientes a mano hasta sumar 100,0000 %." },
  { title: "Genera el fichero", description: "Conluz construye el TXT para la distribuidora. No se guarda: se descarga." },
  { title: "Envíalo a la distribuidora", description: "Fuera de Conluz, por email. La aplicación no puede comprobar este paso." },
  { title: "Ponlo en vigor", description: "Sella el reparto cuando la distribuidora lo acepte. Deja de ser editable." },
  { title: "Registra las fechas de aplicación", description: "Marca la fecha en la que la distribuidora aplicó cada coeficiente." },
];

function currentStageFor(nextStep: SharingAgreementNextStep): StageNumber | undefined {
  switch (nextStep.kind) {
    case "AUTHOR_COEFFICIENTS":
      return 1;
    case "GENERATE_AND_SEND":
      return 2;
    case "RECORD_APPLICATION_DATES":
      return 5;
    default:
      return undefined;
  }
}

interface PanelContent {
  title: string;
  body?: string;
  secondaryLine?: string;
  requirement?: string;
}

function contentFor(nextStep: Exclude<SharingAgreementNextStep, { kind: "NONE" } | { kind: "ALL_DONE" }>): PanelContent {
  switch (nextStep.kind) {
    case "AUTHOR_COEFFICIENTS":
      if (nextStep.blockedReason === "NO_COEFFICIENTS") {
        return {
          title: "Define el reparto",
          body: "Sube el fichero TXT de reparto o introduce los coeficientes a mano.",
          requirement: "Este acuerdo todavía no tiene coeficientes.",
        };
      }
      return {
        title: "Ajusta el reparto",
        body: "Los coeficientes deben sumar 100,0000 % antes de poder generar el fichero o poner el acuerdo en vigor.",
        requirement: formatCoefficientGapMessage(nextStep.deltaMillionths) ?? undefined,
      };

    case "GENERATE_AND_SEND":
      if (nextStep.canGenerate) {
        return {
          title: "Genera el fichero y envíalo a la distribuidora",
          body: "Conluz construye el TXT a partir de los coeficientes y lo descarga. El envío se hace fuera de la aplicación, por email.",
          secondaryLine: "Cuando la distribuidora confirme que lo ha aplicado, pon el acuerdo en vigor.",
        };
      }
      return {
        title: "Genera el fichero y envíalo a la distribuidora",
        requirement: "La planta no tiene CAU configurado. Sin él no se puede generar el fichero.",
      };

    case "RECORD_APPLICATION_DATES":
      return {
        title: "Registra las fechas de aplicación",
        body: "Marca la fecha en la que la distribuidora aplicó cada coeficiente.",
        requirement:
          nextStep.pendingCount === 1
            ? "1 coeficiente sin fecha de aplicación."
            : `${nextStep.pendingCount} coeficientes sin fecha de aplicación.`,
      };
  }
}

const StepsDisclosure: FC<{ currentStage: StageNumber | undefined }> = ({ currentStage }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mt: 2 }}>
      <AppAccordion title="Ver todos los pasos">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {STAGES.map((stage, index) => {
            const stageNumber = (index + 1) as StageNumber;
            const isCurrent = stageNumber === currentStage;
            const isExternal = stageNumber === EXTERNAL_STAGE;

            return (
              <Box
                key={stage.title}
                sx={{
                  p: 1,
                  borderRadius: radii.default,
                  bgcolor: isCurrent ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={isCurrent ? 700 : 600}
                  sx={{
                    color: isExternal ? colors.text.subtle : "text.primary",
                    fontStyle: isExternal ? "italic" : "normal",
                  }}
                >
                  {stageNumber}. {stage.title}
                  {isExternal ? " (fuera de Conluz)" : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stage.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </AppAccordion>
    </Box>
  );
};

const PanelBody: FC<{ content: PanelContent }> = ({ content }) => (
  <>
    <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 1 }}>
      {content.title}
    </Typography>
    {content.body && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: content.requirement || content.secondaryLine ? 1 : 0 }}>
        {content.body}
      </Typography>
    )}
    {content.requirement && (
      <Typography variant="body2" fontWeight="600" color="text.secondary">
        {content.requirement}
      </Typography>
    )}
    {content.secondaryLine && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {content.secondaryLine}
      </Typography>
    )}
  </>
);

export const SharingAgreementNextStepPanel: FC<SharingAgreementNextStepPanelProps> = ({ nextStep }) => {
  if (nextStep.kind === "NONE") return null;

  if (nextStep.kind === "ALL_DONE") {
    return (
      <Typography variant="body2" color="text.secondary">
        El reparto está en vigor y todos los coeficientes tienen fecha de aplicación.
      </Typography>
    );
  }

  const content = contentFor(nextStep);
  const currentStage = currentStageFor(nextStep);

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <PanelBody content={content} />
      <StepsDisclosure currentStage={currentStage} />
    </Paper>
  );
};
