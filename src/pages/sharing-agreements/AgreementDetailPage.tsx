import { useEffect, useMemo, useState, type FC } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DonutChart } from "../../components/DonutChart";
import { SumCheck } from "../../components/SumCheck";
import { useErrorDispatch } from "../../context/error.context";
import {
  useGetSharingAgreement,
  useGetSharingAgreementPartitions,
  useImportSharingAgreementPartitions,
  useDeleteSharingAgreement,
  getGetSharingAgreementPartitionsQueryKey,
  getGetAllSharingAgreementsQueryKey,
} from "../../api/supplies/supplies";
import {
  fmtDate,
  fmtPeriod,
  fmtCoef,
  buildAgreementLabel,
  DONUT_COLORS,
  type CoefficientMap,
} from "./agreements.helpers";
import { BulkUploadModal } from "./BulkUploadModal";

const CoefTrend: FC<{ current: number; previous: number | undefined }> = ({ current, previous }) => {
  if (previous === undefined || previous === null) {
    return (
      <Chip
        label="Alta"
        size="small"
        sx={{ bgcolor: "#eff6ff", color: "#3b82f6", fontWeight: 600, fontSize: 11, height: 22 }}
      />
    );
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.0001) {
    return (
      <Chip
        label="Sin cambio"
        size="small"
        sx={{ bgcolor: "#f5f7fa", color: "#6b7280", fontWeight: 600, fontSize: 11, height: 22 }}
      />
    );
  }
  const pct = ((current - previous) / previous) * 100;
  if (diff > 0) {
    return (
      <Chip
        icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
        label={`+${Math.abs(pct).toFixed(1)}%`}
        size="small"
        sx={{ bgcolor: "#ecfdf5", color: "#10b981", fontWeight: 600, fontSize: 11, height: 22 }}
      />
    );
  }
  return (
    <Chip
      icon={<TrendingDownIcon sx={{ fontSize: 14 }} />}
      label={`−${Math.abs(pct).toFixed(1)}%`}
      size="small"
      sx={{ bgcolor: "#fef2f2", color: "#ef4444", fontWeight: 600, fontSize: 11, height: 22 }}
    />
  );
};

interface Entry {
  id: string;
  name: string;
  address: string;
  cups: string;
  user: string;
  value: number;
  prevCoef: number | undefined;
}

interface MissingEntry {
  id: string;
  name: string;
  address: string;
  cups: string;
  user: string;
  value: number;
}

export const AgreementDetailPage: FC = () => {
  const { agreementId = "" } = useParams();
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const queryClient = useQueryClient();

  const { data: agreement, isLoading: agreementLoading, error: agreementError } = useGetSharingAgreement(agreementId);
  const { data: partitions = [] } = useGetSharingAgreementPartitions(agreementId);
  const importMutation = useImportSharingAgreementPartitions();
  const deleteMutation = useDeleteSharingAgreement();

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [coefs, setCoefs] = useState<CoefficientMap>({});
  const [showBulk, setShowBulk] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const partitionsMap = useMemo(() => {
    const map: CoefficientMap = {};
    partitions.forEach((p) => {
      if (p.supplyId && p.coefficient != null) {
        map[p.supplyId] = p.coefficient / 100;
      }
    });
    return map;
  }, [partitions]);

  useEffect(() => {
    if (!initialized && Object.keys(partitionsMap).length > 0) {
      setCoefs(partitionsMap);
      setInitialized(true);
    }
  }, [partitionsMap, initialized]);

  useEffect(() => {
    if (agreementError) {
      errorDispatch("Error al cargar el acuerdo de reparto");
    }
  }, [agreementError, errorDispatch]);

  const partitionMeta = useMemo(() => {
    const map: Record<string, { name: string; address: string; cups: string; user: string; prevCoef?: number }> = {};
    partitions.forEach((p) => {
      if (p.supplyId) {
        map[p.supplyId] = {
        name: p.supplyName || p.cups || "",
          address: p.address ?? "",
          cups: p.cups ?? "",
          user: p.userFullName ?? "",
          prevCoef: p.previousCoefficient != null ? p.previousCoefficient / 100 : undefined,
        };
      }
    });
    return map;
  }, [partitions]);

  const cupsBySupplyId = useMemo(() => {
    const map: Record<string, string> = {};
    partitions.forEach((p) => {
      if (p.supplyId && p.cups) map[p.supplyId] = p.cups;
    });
    return map;
  }, [partitions]);

  const entries: Entry[] = useMemo(() => {
    return Object.entries(coefs)
      .map(([sid, v]) => {
        const meta = partitionMeta[sid];
        return {
          id: sid,
          name: meta?.name || meta?.cups || sid,
          address: meta?.address ?? "",
          cups: meta?.cups ?? "",
          user: meta?.user ?? "",
          value: v,
          prevCoef: meta?.prevCoef,
        };
      });
  }, [coefs, partitionMeta]);

  const sum = useMemo(() => entries.reduce((s, e) => s + e.value, 0), [entries]);
  const sumValid = Math.abs(sum - 1) < 0.0001;

  const donutData = useMemo(() => entries.filter((e) => e.value > 0).map((e) => ({ name: e.name, value: e.value })), [entries]);

  const missing: MissingEntry[] = useMemo(() => {
    return partitions
      .filter((p) => p.supplyId && coefs[p.supplyId] === undefined && p.previousCoefficient != null && p.previousCoefficient > 0)
      .map((p) => ({
        id: p.supplyId!,
        name: p.supplyName || p.cups || "",
        address: p.address ?? "",
        cups: p.cups ?? "",
        user: p.userFullName ?? "",
        value: p.previousCoefficient! / 100,
      }));
  }, [partitions, coefs]);

  const hasComparison = useMemo(() => partitions.some((p) => p.previousCoefficient != null), [partitions]);

  const initialCsv = useMemo(() => {
    return Object.entries(coefs)
      .map(([sid, v]) => {
        const cups = cupsBySupplyId[sid] || sid;
        return `${cups};${v.toFixed(6).replace(".", ",")}`;
      })
      .join("\n");
  }, [coefs, cupsBySupplyId]);

  const updateCoef = (sid: string, raw: string) => {
    const v = parseFloat(raw);
    setCoefs((c) => ({ ...c, [sid]: isNaN(v) ? 0 : v }));
  };

  const removeSupply = (sid: string) => {
    setCoefs((c) => {
      const nc = { ...c };
      delete nc[sid];
      return nc;
    });
  };

  const handleDiscard = () => {
    setCoefs(partitionsMap);
    setEditing(false);
  };

  const handleSave = () => {
    const lines = Object.entries(coefs)
      .map(([sid, v]) => {
        const cups = cupsBySupplyId[sid] || sid;
        return `${cups};${v.toFixed(6).replace(".", ",")}`;
      })
      .join("\n");
    const file = new File([lines], `${agreementId}.txt`, { type: "text/plain" });
    importMutation.mutate(
      { id: agreementId, data: { file } },
      {
        onSuccess: () => {
          setEditing(false);
          setInitialized(false);
          queryClient.invalidateQueries({ queryKey: getGetSharingAgreementPartitionsQueryKey(agreementId) });
        },
        onError: () => {
          errorDispatch("Error al guardar los coeficientes");
        },
      },
    );
  };

  const handleApplyBulk = (nc: CoefficientMap) => {
    setCoefs(nc);
    setShowBulk(false);
    setEditing(true);
  };

  if (agreementLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 3 }, p: { xs: 0, sm: 2, md: 3 }, minHeight: "100vh", background: "#f5f7fa", width: "100%", boxSizing: "border-box" }}>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <BreadCrumb steps={[{ label: "Inicio", href: "/" }, { label: "Acuerdos de Reparto", href: "/sharing-agreements" }, { label: agreementId, href: "#" }]} />
          </Paper>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, textAlign: "center", boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <Typography color="text.secondary">Cargando acuerdo...</Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  if (!agreement) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 3 }, p: { xs: 0, sm: 2, md: 3 }, minHeight: "100vh", background: "#f5f7fa", width: "100%", boxSizing: "border-box" }}>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <BreadCrumb steps={[{ label: "Inicio", href: "/" }, { label: "Acuerdos de Reparto", href: "/sharing-agreements" }, { label: "No encontrado", href: "#" }]} />
          </Paper>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 6, textAlign: "center", borderRadius: 3, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <WarningRoundedIcon sx={{ fontSize: 64, color: "#f59e0b", mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Acuerdo no encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              El acuerdo de reparto que buscas no existe o ha sido eliminado.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/sharing-agreements")}
              sx={{ bgcolor: "#667eea", borderRadius: 2, textTransform: "none", "&:hover": { bgcolor: "#5568d3" } }}
            >
              Volver a acuerdos de reparto
            </Button>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: "#f5f7fa",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Acuerdos de Reparto", href: "/sharing-agreements" },
            { label: buildAgreementLabel(agreement), href: "#" },
          ]}
        />
      </Box>

      {/* Page Header */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 0, sm: 3 },
            background: "#667eea",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 2,
            mx: { xs: 0, sm: 0 },
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <DonutLargeRoundedIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {buildAgreementLabel(agreement)}
            </Typography>
            {agreement.notes && (
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.25 }}>
                {agreement.notes}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          }}
        >
          {/* Period */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#eef0fd", color: "#667eea" }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500, fontSize: 13 }}>
                Período de vigencia
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: 16, sm: 18 }, mt: 0.5 }}
            >
              {fmtPeriod(agreement)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, mt: 0.5, display: "block" }}>
              {agreement.status === "ACTIVE" ? (
                <Typography component="span" variant="caption" sx={{ color: "#10b981", fontWeight: 600 }}>
                  ● Vigente actualmente
                </Typography>
              ) : (
                "Acuerdo finalizado"
              )}
            </Typography>
          </Paper>

          {/* Supply Points */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#eff6ff", color: "#3b82f6" }}>
                <ElectricBoltRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500, fontSize: 13 }}>
                Puntos de suministro
              </Typography>
            </Box>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 26, mt: 0.5 }}
            >
              {entries.length}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, mt: 0.5, display: "block" }}>
              {agreement.supplyCount != null && entries.length === agreement.supplyCount
                ? "Total en el acuerdo"
                : `${entries.length} activos`}
            </Typography>
          </Paper>

          {/* Sum Total */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: sumValid ? "#ecfdf5" : "#fef2f2",
                  color: sumValid ? "#10b981" : "#ef4444",
                }}
              >
                {sumValid ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
                ) : (
                  <WarningRoundedIcon sx={{ fontSize: 20 }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500, fontSize: 13 }}>
                Suma total
              </Typography>
            </Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 26,
                mt: 0.5,
                color: sumValid ? "#10b981" : "#ef4444",
              }}
            >
              {(sum * 100).toFixed(4)}%
            </Typography>
            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, mt: 0.5, display: "block" }}>
              Objetivo: 100.0000%
            </Typography>
          </Paper>

          {/* Created */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#f5f3ff", color: "#8b5cf6" }}>
                <EventNoteRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500, fontSize: 13 }}>
                Creado
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: 16, sm: 18 }, mt: 0.5 }}
            >
              {fmtDate(agreement.createdAt)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, mt: 0.5, display: "block" }}>
              Última edición: {fmtDate(agreement.updatedAt)}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Sum Check */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <SumCheck sum={sum} count={entries.length} />
      </Box>

      {/* Donut + Actions */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, sm: 2 },
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          }}
        >
          {/* Donut Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 16 }}>
                  Reparto
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280", fontSize: 13 }}>
                  Distribución entre los {entries.length} puntos de suministro
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <DonutChart data={donutData} total={sum} size={220} />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  flex: 1,
                  maxHeight: 220,
                  overflowY: "auto",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                {donutData.map((d, i) => (
                  <Box
                    key={d.name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 0.75,
                      borderRadius: 1,
                      "&:hover": { bgcolor: "#f5f7fa" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "3px",
                        flexShrink: 0,
                        bgcolor: DONUT_COLORS[i % DONUT_COLORS.length],
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 13,
                      }}
                    >
                      {d.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {sum > 0 ? ((d.value / sum) * 100).toFixed(2) : "0.00"}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>

          {/* Actions Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 16 }}>
              Acciones
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", fontSize: 13, mb: 1 }}>
              Gestiona los coeficientes de este acuerdo
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<EditRoundedIcon />}
                onClick={() => setEditing(!editing)}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  borderRadius: 1.5,
                  p: "10px 14px",
                  borderColor: editing ? "#667eea" : "#e5e7eb",
                  color: editing ? "#667eea" : "#1f2937",
                  bgcolor: editing ? "#eef0fd" : "transparent",
                  "&:hover": { borderColor: "#667eea", bgcolor: editing ? "#eef0fd" : "#f5f7fa" },
                }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    {editing ? "Salir del modo edición" : "Editar coeficientes"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, display: "block" }}>
                    Modifica valores individualmente
                  </Typography>
                </Box>
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<FileUploadRoundedIcon />}
                onClick={() => setShowBulk(true)}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  borderRadius: 1.5,
                  p: "10px 14px",
                  borderColor: "#e5e7eb",
                  color: "#1f2937",
                  "&:hover": { borderColor: "#667eea", bgcolor: "#f5f7fa" },
                }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    Importar fichero de la distribuidora
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, display: "block" }}>
                    Reemplaza el reparto con un nuevo CSV
                  </Typography>
                </Box>
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<FileDownloadRoundedIcon />}
                disabled
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  borderRadius: 1.5,
                  p: "10px 14px",
                  borderColor: "#e5e7eb",
                  color: "#1f2937",
                  opacity: 0.5,
                }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    Exportar CSV
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12, display: "block" }}>
                    Descargar reparto actual
                  </Typography>
                </Box>
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DeleteForeverRoundedIcon />}
                onClick={() => setShowDeleteConfirm(true)}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  borderRadius: 1.5,
                  p: "10px 14px",
                  borderColor: "#fecaca",
                  color: "#ef4444",
                  "&:hover": { borderColor: "#ef4444", bgcolor: "#fef2f2" },
                }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    Eliminar acuerdo
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#ef4444", fontSize: 12, display: "block" }}>
                    Elimina permanentemente este acuerdo
                  </Typography>
                </Box>
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Coefficient Table Card */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: 2, sm: 3 },
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 16 }}>
                Coeficientes por punto de suministro
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280", fontSize: 13 }}>
                {hasComparison
                  ? "Comparado con el acuerdo anterior"
                  : "Sin acuerdo anterior con que comparar"}
              </Typography>
            </Box>
            {editing && (
              <Chip
                label="Editando"
                size="small"
                sx={{ bgcolor: "#eff6ff", color: "#3b82f6", fontWeight: 600, fontSize: 11, height: 22 }}
              />
            )}
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: { xs: 600, md: 700 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    Punto de suministro
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    CUPS
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    Socio
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em", textAlign: "right" }}>
                    Anterior
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em", textAlign: "right" }}>
                    Coeficiente
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em", textAlign: "right" }}>
                    Δ
                  </TableCell>
                  {editing && (
                    <TableCell sx={{ width: 40 }} />
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {[...entries].sort((a, b) => b.value - a.value).map((e, i) => {
                  return (
                    <TableRow key={e.id} sx={{ "&:last-child td": { borderBottom: "none" } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              flexShrink: 0,
                              bgcolor: DONUT_COLORS[i % DONUT_COLORS.length],
                            }}
                          />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {e.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12 }}>
                              {e.address}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6b7280" }}
                        >
                          {e.cups}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {e.user}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 13,
                            color: "#6b7280",
                          }}
                        >
                          {e.prevCoef !== undefined ? fmtCoef(e.prevCoef) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        {editing ? (
                          <TextField
                            type="number"
                            size="small"
                            value={e.value}
                            onChange={(ev) => updateCoef(e.id, ev.target.value)}
                            inputProps={{ step: "0.0001", min: 0, max: 1, style: { textAlign: "right", fontFamily: "'JetBrains Mono', monospace" } }}
                            sx={{
                              width: 110,
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 1,
                                fontSize: 14,
                                fontWeight: 700,
                                fontFamily: "'JetBrains Mono', monospace",
                              },
                            }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}
                          >
                            {fmtCoef(e.value)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        {e.prevCoef !== undefined ? (
                          <CoefTrend current={e.value} previous={e.prevCoef} />
                        ) : (
                          <Chip
                            label="Alta"
                            size="small"
                            sx={{ bgcolor: "#eff6ff", color: "#3b82f6", fontWeight: 600, fontSize: 11, height: 22 }}
                          />
                        )}
                      </TableCell>
                      {editing && (
                        <TableCell sx={{ textAlign: "right" }}>
                          <IconButton
                            size="small"
                            onClick={() => removeSupply(e.id)}
                            sx={{ color: "#6b7280", "&:hover": { color: "#ef4444" } }}
                          >
                            <RemoveCircleOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}

                {/* Missing from this agreement (baja) */}
                {missing.map((e) => (
                  <TableRow
                    key={"missing-" + e.id}
                    sx={{ opacity: 0.55, "&:last-child td": { borderBottom: "none" } }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            flexShrink: 0,
                            bgcolor: "#d1d5db",
                          }}
                        />
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              textDecoration: "line-through",
                              textDecorationColor: "#d1d5db",
                            }}
                          >
                            {e.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 12 }}>
                            {e.address}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6b7280" }}
                      >
                        {e.cups}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 13 }}>
                        {e.user}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#6b7280" }}
                      >
                        {fmtCoef(e.value)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Chip
                        label="Baja"
                        size="small"
                        sx={{ bgcolor: "#fef2f2", color: "#ef4444", fontWeight: 600, fontSize: 11, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <CoefTrend current={0} previous={e.value} />
                    </TableCell>
                    {editing && (
                      <TableCell sx={{ textAlign: "right" }}>
                        <Button
                          size="small"
                          startIcon={<RestoreRoundedIcon />}
                          onClick={() => setCoefs((c) => ({ ...c, [e.id]: 0 }))}
                          sx={{ textTransform: "none", borderRadius: 1.5, fontSize: 12 }}
                        >
                          Restaurar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableBody
                sx={{
                  "& .MuiTableCell-root": {
                    bgcolor: "#f5f7fa",
                    borderTop: "2px solid #e5e7eb",
                    fontWeight: 600,
                  },
                }}
              >
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: "right", color: "#6b7280" }}>
                    Suma total
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "right",
                      fontWeight: 800,
                      fontSize: 15,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: sumValid ? "#10b981" : "#ef4444",
                    }}
                  >
                    {(sum * 100).toFixed(4)}%
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "right",
                      fontSize: 12,
                      fontWeight: 700,
                      color: sumValid ? "#10b981" : "#ef4444",
                    }}
                  >
                    {sumValid ? "✓ Válido" : `Δ ${((sum - 1) * 100).toFixed(4)} pp`}
                  </TableCell>
                  {editing && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      {/* Edit Sticky Footer */}
      {editing && (
        <Box
          sx={{
            position: "sticky",
            bottom: 16,
            bgcolor: "white",
            p: "14px 18px",
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 30px rgba(0,0,0,.06)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#6b7280", fontSize: 13, mr: "auto", display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            Recuerda que los coeficientes deben sumar 100.0000%
          </Typography>
          <Button
            variant="outlined"
            onClick={handleDiscard}
            sx={{ textTransform: "none", borderRadius: 2, borderColor: "#e5e7eb", color: "#374151" }}
          >
            Descartar cambios
          </Button>
          <Button
            variant="contained"
            disabled={!sumValid || importMutation.isPending}
            onClick={handleSave}
            sx={{
              bgcolor: "#667eea",
              textTransform: "none",
              borderRadius: 2,
              "&:hover": { bgcolor: "#5568d3" },
              "&.Mui-disabled": { bgcolor: "#d1d5db" },
            }}
          >
            {importMutation.isPending ? "Guardando..." : "Guardar coeficientes"}
          </Button>
        </Box>
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <BulkUploadModal
          key={agreementId}
          open={showBulk}
          onClose={() => setShowBulk(false)}
          onApply={handleApplyBulk}
          initialCsv={initialCsv}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          Eliminar acuerdo de reparto
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14, color: "#6b7280" }}>
            ¿Estás seguro de que deseas eliminar este acuerdo de reparto?
            Esta acción no se puede deshacer. Los coeficientes de reparto dejarán
            de estar disponibles para cálculos de producción y consumo.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setShowDeleteConfirm(false)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(
                { id: agreementId },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getGetAllSharingAgreementsQueryKey() });
                    navigate("/sharing-agreements");
                  },
                  onError: () => {
                    errorDispatch("Error al eliminar el acuerdo de reparto");
                    setShowDeleteConfirm(false);
                  },
                },
              )
            }
            sx={{ bgcolor: "#ef4444", textTransform: "none", borderRadius: 2, "&:hover": { bgcolor: "#dc2626" } }}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
