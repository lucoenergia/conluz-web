import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { Box, Button, TextField } from "@mui/material";
import { ActionStatus } from "../../../components/ActionStatus";
import { Notice } from "../../../components/Notice";
import { ResponsiveOverlay } from "../../../components/ResponsiveOverlay";
import type { PlantResponse, PlantSharingObservationResponse } from "../../../api/models";
import { buildClaimText } from "./claimText";

const TITLE = "Texto de reclamación";
const COPIED = "Texto copiado.";
const COPY_BY_HAND = "No se ha podido copiar. Selecciona el texto y cópialo a mano.";

/** How long "Texto copiado." stays, as the other copy buttons of the app. */
const COPY_FEEDBACK_MS = 2000;

type CopyResult = "copied" | "byHand" | null;

interface ClaimTextDialogProps {
  observation: PlantSharingObservationResponse;
  plant: Pick<PlantResponse, "regulatoryCode">;
}

/**
 * "Preparar texto de reclamación" and the dialog it opens (UI-AGR-046,
 * UI-AGR-049): the claim to the distributor, built from the observation
 * already on the page, in a read-only field to review and copy. Conluz sends
 * nothing; copying is the only thing it does, and with no clipboard it says to
 * copy by hand.
 */
export const ClaimTextDialog: FC<ClaimTextDialogProps> = ({ observation, plant }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CopyResult>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const text = useMemo(() => buildClaimText(observation, plant), [observation, plant]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const openDialog = () => {
    clearTimeout(feedbackTimer.current);
    setResult(null);
    setOpen(true);
  };

  const copy = async () => {
    clearTimeout(feedbackTimer.current);
    try {
      // Missing in an insecure context; rejecting when permission is denied.
      await navigator.clipboard.writeText(text);
    } catch {
      setResult("byHand");
      return;
    }
    setResult("copied");
    feedbackTimer.current = setTimeout(() => setResult(null), COPY_FEEDBACK_MS);
  };

  const message = result === "copied" ? COPIED : result === "byHand" ? COPY_BY_HAND : "";

  return (
    <>
      <Button variant="outlined" onClick={openDialog}>
        Preparar texto de reclamación
      </Button>
      <ResponsiveOverlay
        open={open}
        onClose={() => setOpen(false)}
        title={TITLE}
        size="form"
        actions={
          <Button variant="contained" onClick={() => void copy()}>
            Copiar texto
          </Button>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Notice severity="info">
            Revisa el texto, completa los datos entre corchetes y quita lo que no quieras reclamar. Conluz no envía nada.
          </Notice>
          <TextField
            label={TITLE}
            value={text}
            multiline
            fullWidth
            slotProps={{ htmlInput: { readOnly: true } }}
          />
          <ActionStatus message={message} />
          {message && <Notice severity={result === "copied" ? "success" : "info"}>{message}</Notice>}
        </Box>
      </ResponsiveOverlay>
    </>
  );
};
