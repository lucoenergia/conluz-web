import { useEffect, useRef, useState, type FC } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import type { ContactChannelResponse } from "../../api/models";
import { colors, radii } from "../../theme/tokens";
import { ActionStatus } from "../ActionStatus";
import { CONTACT_CHANNEL_TYPE_LABELS } from "../ContactChannelList/channelTypes";

/** Where saving the new order stands, as the page that sends it knows. */
export type ContactChannelReorderStatus = "idle" | "saving" | "failed" | "lostRights";

export interface ContactChannelReorderListProps {
  /** The channels in their saved order. The new order is local until it is saved. */
  channels: ContactChannelResponse[];
  status?: ContactChannelReorderStatus;
  onSave: (ordered: ContactChannelResponse[]) => void;
  /** Leaves the order mode, discarding the moves. */
  onCancel: () => void;
  /** Leaves after the caller lost the right to edit, so the page can refresh what they may do. */
  onLostRightsClose: () => void;
  /**
   * Announces each move through the page's own status region. Without it, the
   * list announces the moves itself.
   */
  onAnnounce?: (message: string) => void;
}

interface Row {
  /** The channel's position in the saved order: stable while it moves. */
  key: number;
  channel: ContactChannelResponse;
}

type Direction = "up" | "down";

/**
 * Reorders a community's contact channels with "Subir" and "Bajar" (#296), no
 * drag and drop. Each move is local and announced, and focus stays on the
 * channel that moved; nothing is sent until "Guardar orden".
 */
export const ContactChannelReorderList: FC<ContactChannelReorderListProps> = ({
  channels,
  status = "idle",
  onSave,
  onCancel,
  onLostRightsClose,
  onAnnounce,
}) => {
  const [rows, setRows] = useState<Row[]>(() => channels.map((channel, key) => ({ key, channel })));
  const [moved, setMoved] = useState<{ key: number; direction: Direction } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());

  const saving = status === "saving";
  const lostRights = status === "lostRights";

  // Focus follows the moved channel: the same button, or the other one of its
  // row when the move took it to the top or the bottom.
  useEffect(() => {
    if (!moved) return;
    const same = buttons.current.get(`${moved.key}-${moved.direction}`);
    const other = buttons.current.get(`${moved.key}-${moved.direction === "up" ? "down" : "up"}`);
    (same ?? other)?.focus();
  }, [moved, rows]);

  const move = (position: number, direction: Direction) => {
    const target = direction === "up" ? position - 1 : position + 1;
    const next = [...rows];
    [next[position], next[target]] = [next[target], next[position]];
    setRows(next);
    setMoved({ key: next[target].key, direction });
    const message = `«${next[target].channel.label}» está ahora en la posición ${target + 1} de ${next.length}.`;
    if (onAnnounce) onAnnounce(message);
    else setAnnouncement(message);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography
        variant="body2"
        sx={{ color: colors.text.body, backgroundColor: colors.background.surface, borderRadius: radii.default, p: 1.5 }}
      >
        Usa Subir y Bajar para mover cada canal. El nuevo orden no se guarda hasta que pulses Guardar orden.
      </Typography>

      {status === "failed" && (
        <Alert severity="error" role="alert">
          <strong>No se ha guardado el orden.</strong> Inténtalo de nuevo en unos minutos.
        </Alert>
      )}
      {lostRights && (
        <Alert severity="error" role="alert">
          Ya no puedes editar el contacto de esta comunidad. No se han guardado los cambios.
        </Alert>
      )}

      <Box
        component="ol"
        aria-label="Orden de los canales"
        sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}
      >
        {rows.map((row, position) => {
          const highlighted = moved?.key === row.key;
          const { label, type, value } = row.channel;
          // With both buttons, a narrow row puts them under the name, as one
          // line cannot hold the name and both.
          const both = position > 0 && position < rows.length - 1;
          return (
            <Box
              component="li"
              key={row.key}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: 1.5,
                rowGap: 1,
                p: "8px 8px 8px 12px",
                border: 1,
                borderRadius: radii.default,
                borderColor: highlighted ? "primary.main" : colors.border.light,
                backgroundColor: highlighted ? colors.brand.surface : "background.paper",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: 1,
                  borderColor: colors.border.light,
                  backgroundColor: colors.background.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  typography: "body2",
                  fontWeight: 600,
                }}
              >
                {position + 1}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: colors.text.subtle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {CONTACT_CHANNEL_TYPE_LABELS[type]} · {value}
                </Typography>
              </Box>
              {!lostRights && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexShrink: 0,
                    justifyContent: "flex-end",
                    flexBasis: both ? { xs: "100%", md: "auto" } : "auto",
                  }}
                >
                  {position > 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<ArrowUpwardIcon />}
                      aria-label={`Subir ${label}`}
                      disabled={saving}
                      ref={(element) => {
                        buttons.current.set(`${row.key}-up`, element);
                      }}
                      onClick={() => move(position, "up")}
                      sx={{ minHeight: 44 }}
                    >
                      Subir
                    </Button>
                  )}
                  {position < rows.length - 1 && (
                    <Button
                      variant="outlined"
                      startIcon={<ArrowDownwardIcon />}
                      aria-label={`Bajar ${label}`}
                      disabled={saving}
                      ref={(element) => {
                        buttons.current.set(`${row.key}-down`, element);
                      }}
                      onClick={() => move(position, "down")}
                      sx={{ minHeight: 44 }}
                    >
                      Bajar
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "flex-end",
          position: { xs: "sticky", md: "static" },
          bottom: 0,
          mx: { xs: -2, md: 0 },
          px: { xs: 2, md: 0 },
          py: { xs: 1.5, md: 0 },
          backgroundColor: "background.paper",
          borderTop: { xs: 1, md: 0 },
          borderColor: "divider",
        }}
      >
        {lostRights ? (
          <Button variant="contained" size="large" onClick={onLostRightsClose} sx={{ minHeight: 44, flex: { xs: 1, md: "none" }, whiteSpace: "nowrap" }}>
            Cerrar
          </Button>
        ) : saving ? (
          <Button
            variant="contained"
            size="large"
            aria-disabled
            startIcon={<CircularProgress size={18} color="inherit" />}
            sx={{ minHeight: 44, flex: { xs: 1, md: "none" }, whiteSpace: "nowrap" }}
          >
            Guardando…
          </Button>
        ) : (
          <>
            <Button variant="outlined" size="large" onClick={onCancel} sx={{ minHeight: 44, flex: { xs: 1, md: "none" }, whiteSpace: "nowrap" }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => onSave(rows.map((row) => row.channel))}
              sx={{ minHeight: 44, flex: { xs: 1, md: "none" }, whiteSpace: "nowrap" }}
            >
              Guardar orden
            </Button>
          </>
        )}
      </Box>

      {!onAnnounce && <ActionStatus message={announcement} />}
    </Box>
  );
};
