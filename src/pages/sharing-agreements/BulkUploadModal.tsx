import { useMemo, useState, type FC } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import { SumCheck } from "../../components/SumCheck";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models/supplyResponse";
import { fmtCoef, type CoefficientMap } from "./agreements.helpers";

interface ParsedRow {
  line: number;
  code: string;
  value: number;
  supply: SupplyResponse | undefined;
  errors: string[];
}

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (coefficients: CoefficientMap) => void;
  initialCsv: string;
}

export const BulkUploadModal: FC<BulkUploadModalProps> = ({ open, onClose, onApply, initialCsv }) => {
  const [csv, setCsv] = useState(initialCsv);
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const { data: suppliesData = { items: [] } } = useGetAllSupplies({ size: 10000 });
  const supplies = useMemo(() => suppliesData.items ?? [], [suppliesData]);

  const parsed = useMemo(() => {
    const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows: ParsedRow[] = lines.map((l, i) => {
      const [code, val] = l.split(/[;\t]/).map((x) => x?.trim());
      const supply = supplies.find((s) => s.code === code || s.id === code);
      const rawVal = val ?? "";
      const normalVal = rawVal.replace(",", ".");
      const value = parseFloat(normalVal);
      const errors: string[] = [];
      if (!supply) errors.push("CUPS no reconocido");
      if (!rawVal) errors.push("Coeficiente vacío");
      else if (!/^\d+,\d{6}$/.test(rawVal)) errors.push("Debe tener 6 decimales con coma (ej: 0,145000)");
      else if (value < 0 || value > 1) errors.push("Fuera de rango (0–1)");
      return { line: i + 1, code: code ?? "", value, supply, errors };
    });
    const sum = rows.filter((r) => !r.errors.length).reduce((s, r) => s + r.value, 0);
    return {
      rows,
      sum,
      valid: rows.every((r) => !r.errors.length) && Math.abs(sum - 1) < 0.0001,
    };
  }, [csv, supplies]);

  const applyParsed = () => {
    const nc: CoefficientMap = {};
    parsed.rows.forEach((r) => {
      if (r.supply) nc[r.supply.id] = r.value;
    });
    onApply(nc);
  };

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
        Importar coeficientes desde CSV
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 0 }}>
        {step === "paste" && (
          <>
            <Typography variant="body2" sx={{ color: "#6b7280", fontSize: 13, mb: 1.5 }}>
              Pega el contenido del fichero con <strong>CUPS;coeficiente</strong>.
              Separador: punto y coma. Decimal: coma con exactamente 6 dígitos.
              Los coeficientes deben sumar exactamente 1.
            </Typography>
            <TextField
              multiline
              rows={10}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={`ES0021000004271234AB;0,150000\nES0021000004275678CD;0,130000\n…`}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  bgcolor: "#f5f7fa",
                },
              }}
              fullWidth
            />
            <Box sx={{ mt: 1.5, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12 }}>
                {csv.split("\n").filter(Boolean).length} filas detectadas
              </Typography>
              <Button size="small" onClick={() => setCsv("")} sx={{ textTransform: "none", borderRadius: 2 }}>
                Limpiar
              </Button>
              <Button
                size="small"
                onClick={() =>
                  setCsv(
                    supplies
                      .filter((s) => s.enabled)
                      .map((s) => `${s.code};`)
                      .join("\n")
                  )
                }
                sx={{ textTransform: "none", borderRadius: 2, color: "#667eea" }}
              >
                Plantilla con todos los activos
              </Button>
            </Box>
          </>
        )}

        {step === "preview" && (
          <>
            <Box sx={{ mb: 1.5 }}>
              <SumCheck sum={parsed.sum} count={parsed.rows.filter((r) => !r.errors.length).length} />
            </Box>
            <TableContainer
              sx={{
                maxHeight: 360,
                border: "1px solid #e5e7eb",
                borderRadius: 1.5,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>CUPS</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Punto</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12, textAlign: "right" }}>Coef.</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.rows.map((r) => (
                    <TableRow
                      key={r.line}
                      sx={{ bgcolor: r.errors.length ? "#fef2f2" : "transparent" }}
                    >
                      <TableCell sx={{ color: "#6b7280", fontSize: 12 }}>{r.line}</TableCell>
                      <TableCell
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                        }}
                      >
                        {r.code}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        {r.supply?.name ?? (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ color: "#9ca3af", fontStyle: "italic" }}
                          >
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        {isNaN(r.value) ? "—" : fmtCoef(r.value)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {r.errors.length === 0 ? (
                          <Typography
                            variant="caption"
                            sx={{ color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 14 }} />
                            OK
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{ color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}
                          >
                            <WarningIcon sx={{ fontSize: 14 }} />
                            {r.errors.join(", ")}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f7fa", borderTop: "1px solid #e5e7eb" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", borderRadius: 2 }}>
          Cancelar
        </Button>
        {step === "paste" && (
          <Button
            variant="contained"
            onClick={() => setStep("preview")}
            sx={{
              bgcolor: "#667eea",
              textTransform: "none",
              borderRadius: 2,
              "&:hover": { bgcolor: "#5568d3" },
            }}
          >
            Revisar →
          </Button>
        )}
        {step === "preview" && (
          <>
            <Button onClick={() => setStep("paste")} sx={{ textTransform: "none", borderRadius: 2 }}>
              ← Volver
            </Button>
            <Button
              variant="contained"
              disabled={!parsed.valid}
              onClick={applyParsed}
              sx={{
                bgcolor: "#667eea",
                textTransform: "none",
                borderRadius: 2,
                "&:hover": { bgcolor: "#5568d3" },
              }}
            >
              Aplicar al acuerdo
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
