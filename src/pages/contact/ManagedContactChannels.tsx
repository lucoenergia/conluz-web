import { useEffect, useRef, useState, type FC } from "react";
import { Box, Button, Paper, Snackbar, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCommunityByIdQueryKey } from "../../api/communities/communities";
import type { ContactChannelResponse } from "../../api/models";
import { ActionStatus } from "../../components/ActionStatus";
import { ContactChannelEditor, type ContactChannelEditorStatus } from "../../components/ContactChannelEditor";
import { ContactChannelList, contactChannelEditId, contactChannelHeadingId } from "../../components/ContactChannelList";
import { ContactChannelReorderList, type ContactChannelReorderStatus } from "../../components/ContactChannelReorderList";
import { EmptyState } from "../../components/EmptyState";
import { DeleteContactChannelConfirmationModal } from "../../components/Modals/DeleteContactChannelConfirmationModal";
import { SectionHeading } from "../../components/SectionHeading";
import type { CommunityRowActions } from "../../hooks/actions/useCommunityActions";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import {
  CONTACT_CHANNEL_LIMITS,
  CONTACT_CHANNEL_LIMIT_TEXT,
  blankContactChannel,
  toContactChannelBodies,
  toContactChannelDrafts,
  type ContactChannelDraft,
  type ContactChannelErrors,
} from "../../utils/contactChannelRules";
import { contactSaveRefusal } from "./contactSaveRefusal";

type SetContact = NonNullable<CommunityRowActions["actions"]["setContact"]>;

/**
 * An open editor. `snapshot` is the list as it was when the editor opened: the
 * request is built from it, never from the cache at save time, which a refetch
 * may have changed meanwhile (on window focus, typically, after the admin left
 * the app to copy a number). The list sent is the one the admin was looking at.
 */
type Sheet =
  | { mode: "edit"; index: number; snapshot: ContactChannelDraft[]; key: number }
  | { mode: "add"; snapshot: ContactChannelDraft[]; key: number };

type Focus = { kind: "heading" | "edit"; index: number } | { kind: "configure" } | { kind: "element"; element: HTMLElement | null };

export interface ManagedContactChannelsProps {
  communityId: string;
  communityName?: string;
  /** The channels as stored, from the channels query. */
  channels: ContactChannelResponse[];
  setContact: SetContact;
}

const configureId = "contact-configure";

/**
 * The contact channels for whoever manages the community (#296): the members'
 * list with an "Editar" per channel, adding and reordering, and a configure
 * panel when there are none. One channel is edited at a time, and one save
 * runs at a time (UI-CTU-008): every save replaces the whole list, so two of
 * them in flight would overwrite each other. The list shown afterwards is the
 * one the server returned, which the action writes into the channels query.
 */
export const ManagedContactChannels: FC<ManagedContactChannelsProps> = ({
  communityId,
  communityName,
  channels,
  setContact,
}) => {
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [status, setStatus] = useState<ContactChannelEditorStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<ContactChannelErrors>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [ordering, setOrdering] = useState<ContactChannelResponse[] | null>(null);
  const [orderStatus, setOrderStatus] = useState<ContactChannelReorderStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>();
  const [announcement, setAnnouncement] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  // The in-flight flag the handlers read: state would let a second press in
  // before the first one's render.
  const inFlight = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const nextKey = useRef(0);

  useEffect(() => {
    if (!focus) return;
    let element: HTMLElement | null;
    if (focus.kind === "element") element = focus.element;
    else if (focus.kind === "configure") element = document.getElementById(configureId)?.querySelector("button") ?? null;
    else element = document.getElementById(focus.kind === "heading" ? contactChannelHeadingId(focus.index) : contactChannelEditId(focus.index));
    // The query tells the page about the saved list a moment after the save
    // resolves, so the target may not be there yet: wait for it.
    if (!element && focus.kind !== "element") return;
    element?.focus();
    setFocus(null);
  }, [focus, channels]);

  const announce = (message: string) => {
    setAnnouncement(message);
    setNotice(message);
  };

  const open = (next: { mode: "edit"; index: number } | { mode: "add" }) => {
    if (inFlight.current) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStatus("idle");
    setFieldErrors(undefined);
    setConfirmingDelete(false);
    setSheet({ ...next, snapshot: toContactChannelDrafts(channels), key: nextKey.current++ });
  };

  const closeSheet = () => {
    setSheet(null);
    setConfirmingDelete(false);
    setFocus({ kind: "element", element: opener.current });
  };

  // A 403 or 404: what the caller may do is refreshed, and the page shows the
  // members' view once canManage is gone.
  const leaveAfterLostRights = () => {
    setSheet(null);
    setOrdering(null);
    setConfirmingDelete(false);
    void queryClient.invalidateQueries({ queryKey: getGetCommunityByIdQueryKey(communityId) });
  };

  const send = async (list: ContactChannelDraft[]) => {
    inFlight.current = true;
    setSaving(true);
    const result = await setContact.run({ channels: toContactChannelBodies(list) });
    inFlight.current = false;
    setSaving(false);
    return result;
  };

  const saveSheet = async (list: ContactChannelDraft[], kind: "edit" | "add" | "delete") => {
    if (inFlight.current || !sheet) return;
    setStatus("saving");
    setFieldErrors(undefined);
    const editedIndex = sheet.mode === "edit" ? sheet.index : list.length - 1;
    const result = await send(list);

    if ("ok" in result) {
      const stored = result.value.channels;
      setSheet(null);
      setConfirmingDelete(false);
      setStatus("idle");
      if (kind === "delete") {
        setHighlightIndex(undefined);
        if (stored.length === 0) {
          announce("Canal eliminado. Tu comunidad ya no tiene contacto.");
          setFocus({ kind: "configure" });
        } else {
          announce("Canal eliminado.");
          setFocus({ kind: "edit", index: Math.min(editedIndex, stored.length - 1) });
        }
        return;
      }
      const index = kind === "add" ? stored.length - 1 : editedIndex;
      setHighlightIndex(index);
      announce(kind === "add" ? "Canal añadido." : "Canal guardado.");
      setFocus({ kind: "heading", index });
      return;
    }

    setConfirmingDelete(false);
    const refusal = contactSaveRefusal(result.error, list, kind === "delete" ? undefined : editedIndex);
    if (refusal.kind === "fields") {
      setStatus("idle");
      setFieldErrors(refusal.errors);
    } else {
      setStatus(refusal.kind === "offline" ? "offline" : refusal.kind === "lostRights" ? "lostRights" : "serverError");
    }
  };

  const saveOrder = async (ordered: ContactChannelResponse[]) => {
    if (inFlight.current) return;
    setOrderStatus("saving");
    const result = await send(toContactChannelDrafts(ordered));
    if ("ok" in result) {
      setOrdering(null);
      setOrderStatus("idle");
      setHighlightIndex(undefined);
      announce("Orden guardado.");
      setFocus({ kind: "element", element: opener.current });
      return;
    }
    setOrderStatus(contactSaveRefusal(result.error, []).kind === "lostRights" ? "lostRights" : "failed");
  };

  const startOrdering = () => {
    if (inFlight.current) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOrderStatus("idle");
    setOrdering(channels);
  };

  const editing = sheet?.mode === "edit" ? sheet : null;
  const editor = sheet && (
    <ContactChannelEditor
      key={sheet.key}
      open
      mode={sheet.mode}
      initialChannel={editing ? editing.snapshot[editing.index] : blankContactChannel()}
      communityName={communityName}
      status={status}
      fieldErrors={fieldErrors}
      onSave={(draft) =>
        void saveSheet(
          editing ? editing.snapshot.map((channel, index) => (index === editing.index ? draft : channel)) : [...sheet.snapshot, draft],
          sheet.mode,
        )
      }
      onDelete={editing ? () => setConfirmingDelete(true) : undefined}
      onClose={closeSheet}
      onLostRightsClose={leaveAfterLostRights}
    />
  );

  const deleteConfirmation = editing && (
    <DeleteContactChannelConfirmationModal
      isOpen={confirmingDelete && status !== "saving"}
      label={editing.snapshot[editing.index].label}
      otherCount={editing.snapshot.length - 1}
      onCancel={() => setConfirmingDelete(false)}
      onConfirm={() => {
        setConfirmingDelete(false);
        void saveSheet(
          editing.snapshot.filter((_, index) => index !== editing.index),
          "delete",
        );
      }}
    />
  );

  const notices = (
    <>
      <ActionStatus message={announcement} />
      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={(_, reason) => reason !== "clickaway" && setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={notice}
        // Read out through the status region above; announcing it here as well
        // would say it twice.
        slotProps={{ content: { "aria-hidden": true, role: undefined, sx: { bgcolor: "secondary.dark" } } }}
      />
    </>
  );

  const canAdd = channels.length < CONTACT_CHANNEL_LIMITS.maxChannels;

  // The status region, the editor and its confirmation keep their place in the
  // tree when the last channel goes, so none of them is remounted mid-flow.
  return (
    <>
      {notices}
      {channels.length === 0 ? (
        <Box id={configureId}>
          <EmptyState
            icon={SupportAgentRoundedIcon}
            title="Tu comunidad aún no tiene contacto configurado."
            subtitle="Añade cómo pueden contactar los miembros con quien la gestiona."
            actionButton={{
              label: "Configurar contacto",
              startIcon: <AddIcon />,
              onClick: () => open({ mode: "add" }),
            }}
          />
        </Box>
      ) : (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <SectionHeading
        title="Canales de contacto"
        description="Así verán los miembros cómo contactar con quien gestiona la comunidad, y en este orden."
      />
      {ordering ? (
        <ContactChannelReorderList
          channels={ordering}
          status={orderStatus}
          onSave={(ordered) => void saveOrder(ordered)}
          onCancel={() => {
            setOrdering(null);
            setFocus({ kind: "element", element: opener.current });
          }}
          onLostRightsClose={leaveAfterLostRights}
          onAnnounce={setAnnouncement}
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            {canAdd ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                disabled={saving}
                onClick={() => open({ mode: "add" })}
              >
                Añadir canal
              </Button>
            ) : (
              <Typography
                variant="body2"
                sx={{ display: "flex", alignItems: "center", gap: 0.75, color: colors.text.secondary }}
              >
                <InfoOutlinedIcon aria-hidden fontSize="small" />
                {CONTACT_CHANNEL_LIMIT_TEXT}
              </Typography>
            )}
            {channels.length >= 2 && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<UnfoldMoreRoundedIcon />}
                disabled={saving}
                onClick={startOrdering}
              >
                Cambiar orden
              </Button>
            )}
          </Box>
          <ContactChannelList
            channels={channels}
            onEdit={(index) => open({ mode: "edit", index })}
            highlightIndex={highlightIndex}
            editDisabled={saving}
          />
        </Box>
      )}
    </Paper>
      )}
      {editor}
      {deleteConfirmation}
    </>
  );
};
