import { useMemo, useRef, useState, type FC } from "react";
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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { SumCheck } from "../../components/SumCheck";
import { useGetAllSupplies, useCreateSharingAgreement, useImportSharingAgreementPartitions } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models/supplyResponse";
import { SAMPLE_DISTRIBUTOR_TXT } from "./agreements.helpers";

interface ParsedRow {
  line: number;
  code: string;
  value: number;
  supply: SupplyResponse | undefined;
  errors: string[];
}

interface ParsedResult {
  rows: ParsedRow[];
  sum: number;
  valid: boolean;
}

interface NewAgreementModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export const NewAgreementModal: FC<NewAgreementModalProps> = ({ open, onClose, onCreated }) => {
  const [startDate, setStartDate] = useState<Dayjs>(dayjs("2026-06-01"));
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [note, setNote] = useState("");
  const [txtContent, setTxtContent] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: suppliesData = { items: [] } } = useGetAllSupplies({ size: 10000 });
  const supplies = useMemo(() => suppliesData.items ?? [], [suppliesData]);
  const createMutation = useCreateSharingAgreement();
  const importMutation = useImportSharingAgreementPartitions();

  const handleFile = (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setTxtContent((e.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const parsed: ParsedResult | null = useMemo(() => {
    if (!txtContent.trim()) return null;
    const lines = txtContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    const rows = lines.map((l, i) => {
      const parts = l.split(/[;\t]/).map((x) => x?.trim());
      const code = parts[0] ?? "";
      const rawVal = parts[1] ?? "";
      const normalVal = rawVal.replace(",", ".");
      const value = parseFloat(normalVal);
      const supply = supplies.find((s) => s.code === code);
      const errors: string[] = [];
      if (!code) errors.push("CUPS vacío");
      else if (!supply) errors.push("CUPS no reconocido");
      if (!rawVal) errors.push("Coeficiente vacío");
      else if (!/^\d+,\d{6}$/.test(rawVal)) errors.push("Debe tener 6 decimales con coma (ej: 0,145000)");
      else if (value < 0 || value > 1) errors.push("Fuera de rango (0–1)");
      return { line: i + 1, code, value, supply, errors };
    });
    const validRows = rows.filter((r) => r.errors.length === 0);
    const sum = validRows.reduce((s, r) => s + r.value, 0);
    return {
      rows,
      sum,
      valid:
        rows.length > 0 &&
        rows.every((r) => r.errors.length === 0) &&
        Math.abs(sum - 1) < 0.0001,
    };
  }, [txtContent, supplies]);

  const canCreate = startDate && parsed !== null && parsed.valid;

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
          Sube el fichero <strong>TXT</strong> que te ha facilitado la distribuidora
          con los coeficientes de reparto, o pega su contenido. El acuerdo anterior se
          cerrará automáticamente el día previo a la fecha de inicio del nuevo.
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

        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontSize: 13, mb: 1, color: "#1f2937" }}
        >
          Fichero de la distribuidora
        </Typography>

        <Box
          sx={{
            p: 2,
            border: "2px dashed #e5e7eb",
            borderRadius: 2,
            bgcolor: "#f5f7fa",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                borderColor: "#e5e7eb",
                color: "#374151",
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              {fileName ? "Cambiar fichero" : "Seleccionar fichero .txt"}
            </Button>
            {fileName && (
              <Typography
                variant="caption"
                sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#6b7280" }}
              >
                <DescriptionIcon sx={{ fontSize: 14 }} />
                {fileName}
              </Typography>
            )}
            <Button
              size="small"
              startIcon={<AutoFixHighIcon />}
              onClick={() => {
                setTxtContent(SAMPLE_DISTRIBUTOR_TXT);
                setFileName("ejemplo_distribuidora.txt");
              }}
              sx={{
                ml: "auto",
                textTransform: "none",
                borderRadius: 2,
                color: "#667eea",
              }}
            >
              Usar ejemplo
            </Button>
          </Box>

          {parsed && (
            <Box sx={{ mt: 2 }}>
              <SumCheck sum={parsed.sum} count={parsed.rows.filter((r) => !r.errors.length).length} />
              {parsed.rows.some((r) => r.errors.length > 0) && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    bgcolor: "#fef2f2",
                    borderRadius: 1.5,
                    border: "1px solid rgba(239,68,68,.2)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}
                  >
                    {parsed.rows.filter((r) => r.errors.length).length} filas con errores:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2, fontSize: 12, color: "#ef4444" }}>
                    {parsed.rows
                      .filter((r) => r.errors.length > 0)
                      .slice(0, 5)
                      .map((r) => (
                        <li key={r.line}>
                          Línea {r.line} —{" "}
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                          >
                            {r.code || "(vacío)"}
                          </Typography>
                          : {r.errors.join(", ")}
                        </li>
                      ))}
                  </Box>
                </Box>
              )}
              <Typography
                variant="caption"
                sx={{ mt: 1, color: "#6b7280", display: "block", fontSize: 12 }}
              >
                Se importarán{" "}
                <strong>{parsed.rows.filter((r) => !r.errors.length).length}</strong>{" "}
                coeficientes válidos.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f7fa", borderTop: "1px solid #e5e7eb" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!canCreate || createMutation.isPending || importMutation.isPending}
          onClick={async () => {
            try {
              const { id: newId } = await createMutation.mutateAsync({
                data: { startDate: startDate.format("YYYY-MM-DD"), endDate: endDate?.format("YYYY-MM-DD") || undefined, notes: note || undefined },
              });
              if (txtContent.trim()) {
                const file = new File([txtContent], fileName || "coeficientes.txt", { type: "text/plain" });
                await importMutation.mutateAsync({ id: newId!, data: { file } });
              }
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
          {createMutation.isPending ? "Creando acuerdo..." : importMutation.isPending ? "Importando coeficientes..." : "Crear acuerdo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
