import { useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";
import { EmptyState } from "../../components/EmptyState";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { ReadOnlyField } from "../../components/ReadOnlyField";
import { MemberPicker, isMemberPickerUnavailable, memberPickerOptions } from "../../components/MemberPicker";
import type { MembershipResponse } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { useSupplyActions } from "../../hooks/actions";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { todayInAppTimeZone } from "../../utils/zonedTime";
import {
  supplyTransferRefusalOf,
  TRANSFER_CONSEQUENCES,
  transferStateLabel,
  type SupplyTransferField,
} from "./supplyTransfer";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { useSupplyOwnerOptions } from "./useSupplyOwnerOptions";

const GENERIC =
  "Ha habido un problema al cambiar el titular del punto de suministro. Por favor, inténtalo más tarde";

/** Why the date cannot be sent, or null when it can (UI-SUP-027). */
function dateProblemOf(date: Dayjs | null, today: Dayjs): string | null {
  if (!date || !date.isValid()) return "Indica una fecha válida.";
  if (date.isAfter(today, "day")) return "La fecha del cambio no puede ser posterior a hoy.";
  return null;
}

interface SupplyTransferDialogProps {
  supplyId: string;
  onClose: () => void;
}

/**
 * Makes another member of the supply's community its owner (#423), in the
 * shared overlay. Mounted on open, so every opening starts from its own
 * values. The consequences and the submit are the confirmation: no second
 * dialog asks again.
 */
export const SupplyTransferDialog: FC<SupplyTransferDialogProps> = ({ supplyId, onClose }) => {
  const { supply, isNotFound, error, refetch } = useSupplyInActiveCommunity(supplyId);
  const { transferOwnership } = useSupplyActions().forSupply(supply).actions;
  const roster = useSupplyOwnerOptions();
  const errorDispatch = useErrorDispatch();
  const successDispatch = useSuccessDispatch();

  // Today in the app's time zone, fixed when the overlay opens: the backend
  // refuses a later date by that calendar, not the device's.
  const [today] = useState(() => dayjs(todayInAppTimeZone()));
  const [newOwnerId, setNewOwnerId] = useState<string | null>(null);
  const [date, setDate] = useState<Dayjs | null>(today);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SupplyTransferField, string>>>({});
  // The ref answers a second submit before the first has re-rendered; the
  // state locks the overlay and the inputs (UI-OVL-002).
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [refusedField, setRefusedField] = useState<SupplyTransferField | null>(null);
  const ownerRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Never the current owner: the backend refuses a transfer to them (UI-SUP-025).
  const currentOwnerId = supply?.user?.id;
  const exclude = (membership: MembershipResponse) => membership.user.id === currentOwnerId;
  const offered = memberPickerOptions(roster.options, exclude);
  const newOwner = offered.find((membership) => membership.id === newOwnerId);
  const dateProblem = dateProblemOf(date, today);
  const dirty = newOwnerId !== null || date === null || !date.isSame(today, "day");

  // Once the inputs are editable again, the refused one takes focus.
  useEffect(() => {
    if (sending || !refusedField) return;
    if (refusedField === "owner") ownerRef.current?.focus();
    // The picker's field is a row of spinbuttons, one per section; the first
    // is where typing a date starts.
    else dateRef.current?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus();
    setRefusedField(null);
  }, [sending, refusedField]);

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!supply || !transferOwnership || !newOwner || !date || dateProblem || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setFieldErrors({});
    const outcome = await transferOwnership.run({ newOwner, effectiveDate: date.format("YYYY-MM-DD") });
    sendingRef.current = false;
    setSending(false);
    if ("ok" in outcome) {
      onClose();
      successDispatch(`Titular de «${supplyDisplayLabel(supply)}» cambiado a «${newOwner.fullName}».`);
      return;
    }
    // The overlay stays as it was filled in, so the admin corrects the one input.
    const refusal = supplyTransferRefusalOf(outcome.error, GENERIC);
    if ("field" in refusal) {
      setFieldErrors({ [refusal.field]: refusal.message });
      setRefusedField(refusal.field);
    } else {
      errorDispatch(refusal.form);
    }
  };

  // The same answers the supply detail page gives for a supply it cannot show.
  const status = isNotFound ? (
    <EmptyState
      icon={SearchOffIcon}
      title="Punto de suministro no encontrado"
      subtitle="Este punto de suministro no existe o no tienes acceso a su comunidad."
    />
  ) : error ? (
    <LoadErrorAlert
      message="Ha habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde"
      onRetry={() => void refetch()}
    />
  ) : (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress aria-label="Cargando..." />
    </Box>
  );

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Cambiar titular"
      dismissible={!sending}
      dirty={dirty}
      onSubmit={handleSubmit}
      actions={
        <>
          <ModalCancelButton disabled={sending} />
          <Button
            type="submit"
            variant="contained"
            disabled={
              sending ||
              !supply ||
              !transferOwnership ||
              !newOwner ||
              !!dateProblem ||
              isMemberPickerUnavailable(roster.status, offered)
            }
            startIcon={sending ? <CircularProgress color="inherit" size={16} /> : undefined}
          >
            {sending ? "Cambiando titular..." : "Cambiar titular"}
          </Button>
        </>
      }
    >
      {supply ? (
        <>
          {/* Under the title, the supply as the app names it everywhere (UI-SUP-010). */}
          <Typography color="text.secondary">{supplyDisplayLabel(supply)}</Typography>
          <ReadOnlyField id="currentOwner" label="Titular actual" value={supply.ownerRecord?.fullName || "-"} />
          <MemberPicker
            options={roster.options}
            status={roster.status}
            value={newOwnerId}
            onChange={(membership) => {
              setNewOwnerId(membership?.id ?? null);
              setFieldErrors((errors) => ({ ...errors, owner: undefined }));
            }}
            label="Nuevo titular"
            required
            error={fieldErrors.owner}
            emptyText="No hay ningún otro miembro en esta comunidad al que cambiar el titular."
            errorText="No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde."
            exclude={exclude}
            stateLabel={transferStateLabel}
            readOnly={sending}
            inputRef={ownerRef}
          />
          <Box ref={dateRef}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              {/* Opens in place, never in a modal of its own (UI-OVL-011). */}
              <DesktopDatePicker
                label="Fecha del cambio en la distribuidora"
                value={date}
                onChange={(value) => {
                  setDate(value);
                  setFieldErrors((errors) => ({ ...errors, date: undefined }));
                }}
                maxDate={today}
                readOnly={sending}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!fieldErrors.date || !!dateProblem,
                    helperText: fieldErrors.date ?? dateProblem ?? undefined,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
          {/* Neutral text, not a notice or an alert: nothing has gone wrong. */}
          <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5, color: "text.primary" }}>
            {TRANSFER_CONSEQUENCES.map((line) => (
              <Typography key={line} component="li" variant="body2">
                {line}
              </Typography>
            ))}
          </Stack>
        </>
      ) : (
        status
      )}
    </AppModal>
  );
};
