import { useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PageHeaderWithStats } from "../../components/PageHeader";
import { useErrorDispatch } from "../../context/error.context";
import { useGetAllSharingAgreements } from "../../api/supplies/supplies";
import type { SharingAgreementResponse } from "../../api/models/sharingAgreementResponse";
import {
  getAgreementStatus,
  fmtDate,
  fmtPeriod,
  fmtCoef,
  buildAgreementLabel,
} from "./agreements.helpers";
import { NewAgreementModal } from "./NewAgreementModal";

const AgreementRow: FC<{ agreement: SharingAgreementResponse; onClick: () => void }> = ({
  agreement,
  onClick,
}) => {
  const status = getAgreementStatus(agreement);
  const supplyCount = agreement.supplyCount ?? 0;
  const sum = agreement.coefficientSum ?? 0;
  const sumOk = Math.abs(sum - 1) < 0.0001;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: "18px 20px",
        borderRadius: 2,
        border: "1px solid",
        borderColor: status === "current" ? "#10b981" : "#e5e7eb",
        background:
          status === "current"
            ? "linear-gradient(to right, rgba(16,185,129,.04), transparent 40%)"
            : "white",
        borderLeft: status === "current" ? "4px solid #10b981" : "1px solid #e5e7eb",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "auto 1fr auto auto auto" },
        gap: { xs: 1.5, sm: 3 },
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.15s",
        "&:hover": {
          borderColor: "#667eea",
          boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          bgcolor: status === "current" ? "#ecfdf5" : "#f5f7fa",
          color: status === "current" ? "#10b981" : "#6b7280",
        }}
      >
        {status === "current" ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 22 }} />
        ) : (
          <HistoryRoundedIcon sx={{ fontSize: 22 }} />
        )}
      </Box>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
            {buildAgreementLabel(agreement)}
          </Typography>
          {status === "current" && (
            <Chip
              label="Vigente"
              size="small"
              sx={{
                bgcolor: "#ecfdf5",
                color: "#10b981",
                fontWeight: 600,
                fontSize: 11,
                height: 22,
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: 13 }}>
          {agreement.notes}
        </Typography>
      </Box>

      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
        <Typography
          variant="caption"
          sx={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", fontWeight: 600, letterSpacing: ".04em" }}
        >
          Vigencia
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
        >
          {fmtPeriod(agreement)}
        </Typography>
      </Box>

      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
        <Typography
          variant="caption"
          sx={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", fontWeight: 600, letterSpacing: ".04em" }}
        >
          Puntos
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
        >
          {supplyCount}
        </Typography>
      </Box>

      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
        <Typography
          variant="caption"
          sx={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", fontWeight: 600, letterSpacing: ".04em" }}
        >
          Suma
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: sumOk ? "#10b981" : "#ef4444",
          }}
        >
          {fmtCoef(sum)}
        </Typography>
      </Box>
    </Paper>
  );
};

const Timeline: FC<{
  agreements: SharingAgreementResponse[];
  onSelect: (id: string) => void;
}> = ({ agreements, onSelect }) => {
  return (
    <Box sx={{ overflowX: "auto", pb: 1, position: "relative" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${agreements.length}, 1fr)`,
          gap: 0,
          minWidth: { xs: 500, sm: "100%" },
        }}
      >
        {/* Row 1: Period labels */}
        {agreements.map((a) => (
          <Box
            key={"period-" + a.id}
            sx={{ textAlign: "center", pb: 1.5, cursor: "pointer" }}
            onClick={() => onSelect(a.id)}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              {fmtDate(a.startDate).split(" ").slice(1).join(" ")}
            </Typography>
          </Box>
        ))}

        {/* Row 2: Dots with track */}
        <Box
          sx={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: `repeat(${agreements.length}, 1fr)`,
            position: "relative",
            py: 1.5,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 4,
              bgcolor: "#e5e7eb",
              borderRadius: 1,
              transform: "translateY(-50%)",
              zIndex: 0,
            }}
          />
          {agreements.map((a) => {
            const status = getAgreementStatus(a);
            const dotSize = status === "current" ? 20 : 16;
            return (
              <Box
                key={"dot-" + a.id}
                onClick={() => onSelect(a.id)}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "50%",
                    bgcolor:
                      status === "current"
                        ? "#10b981"
                        : status === "past"
                          ? "#9ca3af"
                          : "#3b82f6",
                    border: "3px solid white",
                    boxShadow: `0 0 0 2px ${
                      status === "current"
                        ? "#10b981"
                        : status === "past"
                          ? "#9ca3af"
                          : "#3b82f6"
                    }`,
                    zIndex: 2,
                  }}
                />
              </Box>
            );
          })}
        </Box>

        {/* Row 3: Labels */}
        {agreements.map((a) => (
          <Box
            key={"label-" + a.id}
            sx={{ textAlign: "center", pt: 0.5, cursor: "pointer" }}
            onClick={() => onSelect(a.id)}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: 12,
                fontWeight: 600,
                textAlign: "center",
                maxWidth: 130,
                mx: "auto",
                display: "block",
              }}
            >
              {buildAgreementLabel(a)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const AgreementsPage: FC = () => {
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const { data, isLoading, error } = useGetAllSharingAgreements();
  const agreements = useMemo(() => data?.items ?? [], [data]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (error) {
      errorDispatch("Error al cargar los acuerdos de reparto");
    }
  }, [error, errorDispatch]);

  const sorted = useMemo(
    () =>
      [...agreements].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      ),
    [agreements]
  );

  const timelineAgreements = useMemo(
    () =>
      [...agreements].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      ),
    [agreements]
  );

  const stats = useMemo(
    () => ({
      total: data?.total ?? agreements.length,
      current: data?.active ?? 0,
      past: data?.previous ?? 0,
    }),
    [data, agreements.length]
  );

  const handleCreated = (newId: string) => {
    setShowCreate(false);
    navigate(`/sharing-agreements/${newId}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 3 }, p: { xs: 0, sm: 2, md: 3 }, minHeight: "100vh", background: "#f5f7fa", width: "100%", boxSizing: "border-box" }}>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <BreadCrumb steps={[{ label: "Inicio", href: "/" }, { label: "Acuerdos de Reparto", href: "/sharing-agreements" }]} />
          </Paper>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, textAlign: "center", boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <Typography color="text.secondary">Cargando acuerdos de reparto...</Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  if (agreements.length === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 3 }, p: { xs: 0, sm: 2, md: 3 }, minHeight: "100vh", background: "#f5f7fa", width: "100%", boxSizing: "border-box" }}>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <BreadCrumb steps={[{ label: "Inicio", href: "/" }, { label: "Acuerdos de Reparto", href: "/sharing-agreements" }]} />
          </Paper>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <PageHeaderWithStats
            icon={DonutLargeRoundedIcon}
            title="Acuerdos de Reparto"
            subtitle="Reparto de coeficientes entre los miembros de la comunidad a lo largo del tiempo"
            stats={[
              { value: 0, label: "Acuerdos" },
              { value: 0, label: "Vigente", color: "#6ee7b7" },
              { value: 0, label: "Anteriores" },
            ]}
          />
        </Box>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Paper elevation={0} sx={{ p: 6, textAlign: "center", borderRadius: 3, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}>
            <DonutLargeRoundedIcon sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay acuerdos de reparto
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Comienza creando tu primer acuerdo de reparto
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setShowCreate(true)}
              sx={{
                bgcolor: "#667eea",
                borderRadius: 2,
                textTransform: "none",
                "&:hover": { bgcolor: "#5568d3" },
              }}
            >
              Crear Acuerdo de Reparto
            </Button>
          </Paper>
        </Box>
        <NewAgreementModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
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
          ]}
        />
      </Box>

      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <PageHeaderWithStats
          icon={DonutLargeRoundedIcon}
          title="Acuerdos de Reparto"
          subtitle="Reparto de coeficientes entre los miembros de la comunidad a lo largo del tiempo"
          stats={[
            { value: stats.total, label: "Acuerdos" },
            { value: stats.current, label: "Vigente", color: "#6ee7b7" },
            { value: stats.past, label: "Anteriores" },
          ]}
        />
      </Box>

      {/* Timeline */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>
            Línea de tiempo
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280", fontSize: 13, mb: 1 }}>
            Cada hito representa un acuerdo con su propio set de coeficientes
          </Typography>
          <Timeline agreements={timelineAgreements} onSelect={(id) => navigate(`/sharing-agreements/${id}`)} />
        </Paper>
      </Box>

      {/* Toolbar */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setShowCreate(true)}
            sx={{
              bgcolor: "#667eea",
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              py: 1.5,
              boxShadow: "0 4px 15px 0 rgba(102,126,234,0.4)",
              "&:hover": {
                bgcolor: "#5568d3",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 20px 0 rgba(102,126,234,0.5)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Nuevo acuerdo de reparto
          </Button>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant="caption"
            sx={{ fontSize: 13, color: "#6b7280", display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            Hoy: <strong>{fmtDate(new Date().toISOString())}</strong>
          </Typography>
        </Paper>
      </Box>

      {/* Agreement List */}
      <Box sx={{ px: { xs: 2, sm: 0 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {sorted.map((a) => (
          <AgreementRow
            key={a.id}
            agreement={a}
            onClick={() => navigate(`/sharing-agreements/${a.id}`)}
          />
        ))}
      </Box>

      {/* New Agreement Modal */}
      <NewAgreementModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
};
