import { useState, type FC } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import CloseIcon from "@mui/icons-material/Close";
import { useCreateSharingAgreement } from "../../api/supplies/supplies";

interface NewAgreementModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export const NewAgreementModal: FC<NewAgreementModalProps> = ({ open, onClose, onCreated }) => {
  const [startDate, setStartDate] = useState<Dayjs>(dayjs("2026-06-01"));
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [note, setNote] = useState("");
  const createMutation = useCreateSharingAgreement();

  const canCreate = !!startDate;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 17,
        }}
      >
        Nuevo acuerdo de reparto
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 0 }}>
        <Typography
          variant="body2"
          sx={{ color: "#6b7280", fontSize: 13, mb: 2, mt: 0.5 }}
        >
          El acuerdo anterior se cerrará automáticamente el día previo a la fecha
          de inicio del nuevo.
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 2,
            }}
          >
            <DatePicker
              label="Fecha de inicio de vigencia"
              value={startDate}
              onChange={(value) => setStartDate(dayjs(value))}
              slotProps={{
                textField: {
                  size: "small",
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "6px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.9375rem",
                      height: "40px",
                      "&:hover fieldset": { borderColor: "#667eea" },
                      "&.Mui-focused fieldset": { borderColor: "#667eea", borderWidth: "2px" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#667eea" },
                  },
                },
                popper: {
                  sx: {
                    "& .MuiPickersYear-yearButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": { backgroundColor: "#5568d3 !important" },
                      "&:focus": { backgroundColor: "#667eea !important" },
                    },
                    "& .MuiPickersMonth-monthButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": { backgroundColor: "#5568d3 !important" },
                      "&:focus": { backgroundColor: "#667eea !important" },
                    },
                    "& .MuiPickersDay-root.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": { backgroundColor: "#5568d3 !important" },
                      "&:focus": { backgroundColor: "#667eea !important" },
                    },
                    "& .MuiPickersYear-yearButton:hover": { backgroundColor: "rgba(102, 126, 234, 0.1)" },
                    "& .MuiPickersMonth-monthButton:hover": { backgroundColor: "rgba(102, 126, 234, 0.1)" },
                    "& .MuiPickersDay-root:hover": { backgroundColor: "rgba(102, 126, 234, 0.1)" },
                  },
                },
              }}
            />
            <DatePicker
              label="Fecha de fin"
              value={endDate}
              onChange={(value) => setEndDate(value)}
              minDate={startDate}
              slotProps={{
                textField: {
                  size: "small",
                  helperText: "Opcional — déjalo vacío para vigencia indefinida",
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "6px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.9375rem",
                      height: "40px",
                      "&:hover fieldset": { borderColor: "#667eea" },
                      "&.Mui-focused fieldset": { borderColor: "#667eea", borderWidth: "2px" },
                    },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#667eea" },
                  },
                },
                popper: {
                  sx: {
                    "& .MuiPickersYear-yearButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": { backgroundColor: "#5568d3 !important" },
                      "&:focus": { backgroundColor: "#667eea !important" },
                    },
                    "& .MuiPickersMonth-monthButton.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": { backgroundColor: "#5568d3 !important" },
                      "&:focus": { backgroundColor: "#667eea !important" },
                    },
                    "& .MuiPickersDay-root.Mui-selected": {
                      backgroundColor: "#667eea !important",
                      color: "white !important",
                      "&:hover": { backgroundColor: "#5568d3 !important" },
                      "&:focus": { backgroundColor: "#667eea !important" },
                    },
                    "& .MuiPickersYear-yearButton:hover": { backgroundColor: "rgba(102, 126, 234, 0.1)" },
                    "& .MuiPickersMonth-monthButton:hover": { backgroundColor: "rgba(102, 126, 234, 0.1)" },
                    "& .MuiPickersDay-root:hover": { backgroundColor: "rgba(102, 126, 234, 0.1)" },
                  },
                },
              }}
            />
            <TextField
              label="Nota interna (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              size="small"
              fullWidth
              placeholder="Motivo del nuevo reparto, cambios respecto al anterior, etc."
              sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}
            />
          </Box>
        </LocalizationProvider>

      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f7fa", borderTop: "1px solid #e5e7eb" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!canCreate || createMutation.isPending}
          onClick={async () => {
            try {
              const { id: newId } = await createMutation.mutateAsync({
                data: { startDate: startDate.format("YYYY-MM-DD"), endDate: endDate?.format("YYYY-MM-DD") || undefined, notes: note || undefined },
              });
              onCreated(newId);
            } catch {
              // Error handled by React Query global handler
            }
          }}
          sx={{
            bgcolor: "#667eea",
            textTransform: "none",
            borderRadius: 2,
            "&:hover": { bgcolor: "#5568d3" },
          }}
        >
          {createMutation.isPending ? "Creando acuerdo..." : "Crear acuerdo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
