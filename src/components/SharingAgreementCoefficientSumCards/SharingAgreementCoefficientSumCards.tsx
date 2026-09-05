import type { FC } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { alphas, colors, radii } from "../../theme/tokens";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  formatCoefficientPercentage,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";

export interface SharingAgreementCoefficientSumCardsProps {
  coefficients: CoefficientSummable[];
  agreementStatus: StatusValue | undefined;
}

export const SharingAgreementCoefficientSumCards: FC<SharingAgreementCoefficientSumCardsProps> = ({
  coefficients,
  agreementStatus,
}) => {
  const theme = useTheme();
  const { fileSumUnits, appliedSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
  const showAppliedSum = agreementStatus !== SharingAgreementResponseStatus.DRAFT;
  const appliedSumIsFull = isFullSum(appliedSumUnits);
  const fileSumIsFull = isFullSum(fileSumUnits);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: showAppliedSum ? "repeat(2, 1fr)" : "1fr" },
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: radii.default,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          }}
        >
          <DescriptionOutlinedIcon sx={{ color: "primary.main", fontSize: 24 }} />
          <Box>
            <Typography variant="body1" fontWeight="600">
              {formatCoefficientPercentage(fileSumUnits / COEFFICIENT_SCALE)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Suma del fichero
            </Typography>
          </Box>
        </Box>

        {showAppliedSum && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: radii.default,
                bgcolor: appliedSumIsFull ? alphas.success.subtle : alphas.info.subtle,
              }}
            >
              {appliedSumIsFull ? (
                <CheckCircleOutlineIcon sx={{ color: "success.main", fontSize: 24 }} />
              ) : (
                <InfoOutlinedIcon sx={{ color: "info.main", fontSize: 24 }} />
              )}
              <Box>
                <Typography variant="body1" fontWeight="600">
                  {formatCoefficientPercentage(appliedSumUnits / COEFFICIENT_SCALE)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Suma aplicada
                </Typography>
              </Box>
            </Box>

            {!appliedSumIsFull && (
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: colors.text.subtle }}>
                Suma aplicada por debajo del 100&nbsp;%: normal en transición mientras la distribuidora aplica los
                coeficientes pendientes.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {!fileSumIsFull && agreementStatus === SharingAgreementResponseStatus.DRAFT && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          La suma del fichero debe ser exactamente 100&nbsp;% para poder generar el fichero de reparto o poner el
          acuerdo en vigor.
        </Alert>
      )}
    </Box>
  );
};
