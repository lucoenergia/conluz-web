import { useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { Alert, Button, CircularProgress, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useGetMembershipPayback } from "../../api/memberships/memberships";
import type { MembershipResponse, SetMembershipInvestmentBody } from "../../api/models";
import { ResponsiveOverlay } from "../../components/ResponsiveOverlay";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { Notice } from "../../components/Notice";
import { getFirstCataloguedErrorMessage } from "../../errors/apiErrorCatalogue";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { outcomeFromResource } from "../../hooks/permissions";
import { formatEuros } from "../../utils/formatEnergyFigures";
import { formatDecimalForInput } from "../../utils/parseDecimalInput";
import { validateInvestmentAmount } from "./investmentAmount";

interface MembershipInvestmentEditorProps {
  membership: MembershipResponse;
  communityId: string;
  communityName: string | undefined;
  /** The actions themselves: the editor is mounted only when the row grants them. */
  setInvestment: Action<[SetMembershipInvestmentBody], MembershipWriteResult>;
  clearInvestment: Action<[], MembershipWriteResult>;
  onClose: () => void;
  /** After a write the backend accepted, with the message the page announces. */
  onDone: (message: string) => void;
}

const RETRY_LATER = "Inténtalo de nuevo en unos minutos.";

/**
 * Records, replaces or removes a member's initial investment (#358). The
 * roster does not carry the amount, so the editor reads it from the member's
 * payback, and offers no save until that read has answered: saving over an
 * amount nobody has seen would replace it blindly.
 *
 * Mounted on open, and filled once from the first answer, so a refetch while
 * it is open does not overwrite what is being typed.
 */
export const MembershipInvestmentEditor: FC<MembershipInvestmentEditorProps> = ({
  membership,
  communityId,
  communityName,
  setInvestment,
  clearInvestment,
  onClose,
  onDone,
}) => {
  const userId = membership.user?.id ?? "";
  const canRead = outcomeFromResource(membership.capabilities, "canReadPayback").state === "allowed";
  // Always read afresh: a cached answer can predate a write made since, and the
  // field is filled from the first answer it sees.
  const payback = useGetMembershipPayback(communityId, userId, {
    query: { enabled: canRead && !!communityId && !!userId, refetchOnMount: "always" },
  });

  const [initialText, setInitialText] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<{ headline: string; detail: string } | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [refocusRemove, setRefocusRemove] = useState(false);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const removeRef = useRef<HTMLButtonElement | null>(null);

  // Filled from the first answer only: a later one must not replace the text being typed.
  if (initialText === null && payback.data && payback.isFetchedAfterMount && !payback.isFetching) {
    const filled = payback.data.investmentEur === null ? "" : formatDecimalForInput(payback.data.investmentEur);
    setInitialText(filled);
    setText(filled);
  }

  const ready = initialText !== null;
  const recorded = payback.data?.investmentEur ?? null;
  const saving = setInvestment.isPending;
  const removing = clearInvestment.isPending;
  const inFlight = saving || removing;
  const dirty = ready && text !== initialText;

  const save = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!ready || inFlight) return;
    const check = validateInvestmentAmount(text);
    setAttempted(true);
    if ("error" in check) {
      setFieldError(check.error);
      fieldRef.current?.focus();
      return;
    }
    setFieldError(null);
    setWriteError(null);
    const result = await setInvestment.run({ investmentEur: check.value });
    if ("ok" in result) {
      onDone("Inversión guardada.");
    } else {
      setWriteError({
        headline: "No se ha guardado la inversión.",
        detail: getFirstCataloguedErrorMessage(result.error, RETRY_LATER),
      });
    }
  };

  // A withdrawn removal question gives focus back to "Quitar inversión", once it is back on screen.
  useEffect(() => {
    if (!refocusRemove) return;
    removeRef.current?.focus();
    setRefocusRemove(false);
  }, [refocusRemove]);

  const remove = async () => {
    setConfirmingRemove(false);
    setWriteError(null);
    const result = await clearInvestment.run();
    if ("ok" in result) {
      onDone("Inversión quitada.");
    } else {
      setWriteError({
        headline: "No se ha quitado la inversión.",
        detail: getFirstCataloguedErrorMessage(result.error, RETRY_LATER),
      });
    }
  };

  // Asked in the footer, like the unsaved-changes question (UI-OVL), and only
  // while there is an amount to remove.
  const removeQuestion =
    confirmingRemove && recorded !== null && !inFlight
      ? {
          message: (
            <>
              <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
                ¿Quitar la inversión de {formatEuros(recorded)} registrada para {membership.fullName}?
              </Typography>
              <Typography variant="body2">
                Sin una inversión registrada no se puede calcular cuánto lleva recuperado. Podrás registrarla de
                nuevo cuando quieras.
              </Typography>
            </>
          ),
          cancelLabel: "Cancelar",
          confirmLabel: "Quitar inversión",
          confirmColor: "error" as const,
          onConfirm: () => void remove(),
          onCancel: () => {
            setConfirmingRemove(false);
            setRefocusRemove(true);
          },
        }
      : undefined;

  const recheck = () => {
    if (!attempted) return;
    const check = validateInvestmentAmount(text);
    setFieldError("error" in check ? check.error : null);
  };

  const body = (() => {
    if (!canRead) {
      return (
        <Notice severity="info">
          No puedes consultar la inversión registrada de este miembro, así que no se puede cambiar desde aquí.
        </Notice>
      );
    }
    if (payback.isError && !ready) {
      return (
        <LoadErrorAlert
          message="No se pudo cargar la inversión registrada. Sin ella no se puede guardar otra."
          onRetry={() => void payback.refetch()}
        />
      );
    }
    return (
      <>
        {writeError && (
          <Alert severity="error" role="alert">
            <strong>{writeError.headline}</strong> {writeError.detail}
          </Alert>
        )}
        <TextField
          label="Importe en euros"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={recheck}
          disabled={!ready}
          error={!!fieldError}
          fullWidth
          inputRef={fieldRef}
          placeholder="Por ejemplo: 1500,50"
          helperText={
            !ready
              ? "Cargando el importe actual…"
              : (fieldError ?? "Lo que aportó a la comunidad, con dos decimales como mucho.")
          }
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { readOnly: inFlight, inputMode: "decimal", autoComplete: "off" },
          }}
        />
      </>
    );
  })();

  return (
    <ResponsiveOverlay
      open
      title={`Inversión de ${membership.fullName}`}
      subtitle={communityName}
      size="form"
      dirty={dirty}
      inFlight={inFlight}
      onClose={onClose}
      discardMessage="Tienes un importe sin guardar. Si cierras, se perderá."
      question={removeQuestion}
      onSubmit={(event) => void save(event)}
      actions={({ requestClose, variant }) => (
        <>
          {ready && recorded !== null && (
            <Button
              color="error"
              size="large"
              startIcon={removing ? <CircularProgress size={18} color="inherit" /> : <DeleteOutlineIcon />}
              disabled={inFlight}
              ref={removeRef}
              onClick={() => setConfirmingRemove(true)}
              sx={{ minHeight: 44, mr: variant === "dialog" ? "auto" : 0 }}
            >
              {removing ? "Quitando…" : "Quitar inversión"}
            </Button>
          )}
          <Button
            variant="outlined"
            size="large"
            disabled={inFlight}
            onClick={requestClose}
            sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}
          >
            Cancelar
          </Button>
          {ready && (
            <Button
              variant="contained"
              size="large"
              type="submit"
              disabled={inFlight}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          )}
        </>
      )}
    >
      {body}
    </ResponsiveOverlay>
  );
};
