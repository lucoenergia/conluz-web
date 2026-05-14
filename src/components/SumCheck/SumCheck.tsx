import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";

interface SumCheckProps {
  sum: number;
  count: number;
}

export const SumCheck: FC<SumCheckProps> = ({ sum, count }) => {
  const target = 1.0;
  const diff = Math.abs(sum - target);
  const pct = sum * 100;

  let tone: "ok" | "warn" | "bad" = "bad";
  let msg = "";
  let icon = ErrorIcon;
  if (diff < 0.0001) {
    tone = "ok";
    msg = `Reparto válido \u00b7 ${count} puntos suman exactamente 100.00%`;
    icon = CheckCircleIcon;
  } else if (diff < 0.005) {
    tone = "warn";
    msg = `Tolerable \u00b7 suma ${pct.toFixed(4)}% (desviaci\u00f3n ${(diff * 100).toFixed(4)} pp)`;
    icon = WarningIcon;
  } else {
    tone = "bad";
    msg = `Inválido \u00b7 suma ${pct.toFixed(4)}%, debe ser 100.00%`;
    icon = ErrorIcon;
  }

  const barFill = Math.min(100, pct);
  const Icon = icon;

  const toneStyles = {
    ok: { bg: "#ecfdf5", color: "#10b981", border: "rgba(16,185,129,.2)", barBg: "#10b981" },
    warn: { bg: "#fffbeb", color: "#f59e0b", border: "rgba(245,158,11,.2)", barBg: "#f59e0b" },
    bad: { bg: "#fef2f2", color: "#ef4444", border: "rgba(239,68,68,.2)", barBg: "#ef4444" },
  };

  const s = toneStyles[tone];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: "14px 18px",
        borderRadius: 2,
        fontWeight: 600,
        mb: 2,
        bgcolor: s.bg,
        color: s.color,
        border: "1px solid",
        borderColor: s.border,
        flexWrap: "wrap",
      }}
    >
      <Icon sx={{ fontSize: 20, flexShrink: 0 }} />
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 150 }}>
        {msg}
      </Typography>
      <Box
        sx={{
          flex: 1,
          maxWidth: 200,
          height: 8,
          borderRadius: 1,
          bgcolor: "rgba(255,255,255,.5)",
          overflow: "hidden",
          minWidth: 100,
        }}
      >
        <Box
          sx={{
            height: "100%",
            bgcolor: s.barBg,
            transition: "all 0.3s",
            width: barFill + "%",
            borderRadius: 1,
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          minWidth: 90,
          textAlign: "right",
        }}
      >
        {pct.toFixed(4)}%
      </Typography>
    </Box>
  );
};
