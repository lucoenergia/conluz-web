import type { FC, Ref } from "react";
import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import type { CoefficientDatesEffectsResponse } from "../../../api/models";
import { Notice } from "../../../components/Notice";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";
import { FlowActionBar } from "./ApplicationDatesParts";
import { writtenEffectSentences } from "./applicationDatesEffects";
import type { NamedRowError } from "./PreviewStep";

/** How the write ended. */
export type WriteOutcome =
  | { status: "applied"; effects: CoefficientDatesEffectsResponse }
  | { status: "refused"; errors: NamedRowError[] }
  | { status: "failed" };

export interface ResultStepProps {
  outcome: WriteOutcome;
  agreementName: string;
  agreementPath: string;
  /** Where "Volver al reparto observado" leads; absent when the flow did not start there. */
  observationPath: string | undefined;
  headingRef: Ref<HTMLHeadingElement>;
  onBackToPreview: () => void;
  onCancel: () => void;
}

const StepHeading: FC<{ headingRef: Ref<HTMLHeadingElement>; children: string }> = ({ headingRef, children }) => (
  <Typography
    id="application-dates-step"
    ref={headingRef}
    tabIndex={-1}
    variant="h6"
    component="h2"
    sx={{ fontWeight: 700, "&:focus:not(:focus-visible)": { outline: "none" } }}
  >
    {children}
  </Typography>
);

/**
 * Step 3. A write that applied shows what it wrote, from its own response
 * (UI-AGR-035). One refused applied nothing and keeps every date entered
 * (UI-AGR-036). One whose answer never arrived is not known to have applied or
 * not, so it sends the admin back to a dry run on the data as it stands now.
 */
export const ResultStep: FC<ResultStepProps> = ({
  outcome,
  agreementName,
  agreementPath,
  observationPath,
  headingRef,
  onBackToPreview,
  onCancel,
}) => {
  if (outcome.status === "applied") {
    const sentences = writtenEffectSentences(outcome.effects);
    return (
      <>
        <Box component="section" aria-labelledby="application-dates-step" sx={sxStyles.pageContainer}>
          <Box sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2 }}>
            <Notice severity="success">Fechas aplicadas en {agreementName}.</Notice>
            <StepHeading headingRef={headingRef}>Qué ha cambiado</StepHeading>
            {sentences.length > 0 ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                {sentences.map((sentence) => (
                  <li key={sentence}>
                    <Typography>{sentence}</Typography>
                  </li>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: colors.text.body }}>No ha cambiado nada: las fechas ya eran estas.</Typography>
            )}
          </Box>
        </Box>
        <FlowActionBar>
          {observationPath ? (
            <>
              <Button variant="outlined" component={RouterLink} to={agreementPath}>
                Ver el acuerdo
              </Button>
              <Button variant="contained" component={RouterLink} to={observationPath}>
                Volver al reparto observado
              </Button>
            </>
          ) : (
            <Button variant="contained" component={RouterLink} to={agreementPath}>
              Ver el acuerdo
            </Button>
          )}
        </FlowActionBar>
      </>
    );
  }

  return (
    <>
      <Box component="section" aria-labelledby="application-dates-step" sx={sxStyles.pageContainer}>
        <Box sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2 }}>
          <StepHeading headingRef={headingRef}>Resultado</StepHeading>
          {outcome.status === "refused" ? (
            <Alert severity="error">
              <AlertTitle>No se han aplicado las fechas</AlertTitle>
              No se ha cambiado ningún dato. Revisa los errores de cada punto en la vista previa.
              {outcome.errors.length > 0 && (
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
                  {outcome.errors.map(({ name, message }) => (
                    <li key={`${name ?? ""}${message}`}>
                      {name ? (
                        <>
                          <strong>{name}:</strong> {message}
                        </>
                      ) : (
                        message
                      )}
                    </li>
                  ))}
                </Box>
              )}
            </Alert>
          ) : (
            <Alert severity="error">
              <AlertTitle>No se ha podido confirmar si las fechas se han aplicado.</AlertTitle>
              Vuelve a la vista previa para ver el estado actual.
            </Alert>
          )}
          <Notice severity="info">Tus fechas se conservan: no tendrás que volver a escribirlas.</Notice>
        </Box>
      </Box>
      <FlowActionBar>
        <Button variant="text" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={onBackToPreview}>
          Volver a la vista previa
        </Button>
      </FlowActionBar>
    </>
  );
};
