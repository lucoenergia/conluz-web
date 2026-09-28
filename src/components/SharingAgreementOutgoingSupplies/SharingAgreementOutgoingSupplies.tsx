import type { FC } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { PartitionCoefficientResponse } from "../../api/models";
import { colors, radii } from "../../theme/tokens";
import { getRowIdentity } from "../../pages/production/sharingAgreementCoefficientIdentity";
import { formatCoefficientPercentage } from "../../pages/production/sharingAgreementCoefficientSums";
import { formatInForcePowerLine, type InForceAgreementPower } from "../../pages/production/sharingAgreementComparison";

export interface SharingAgreementOutgoingSuppliesProps {
  /** Supplies with a coefficient in force and no row in the draft, in CUPS order. */
  outgoing: PartitionCoefficientResponse[];
  /** The plant's active coefficients could not be read, so which supplies leave is unknown. */
  isError: boolean;
  onRetry: () => void;
  /** Installed power of each authoring agreement, for the in-force power line. */
  powerByAgreementId: ReadonlyMap<string, InForceAgreementPower>;
}

const HEADER_SX = { fontWeight: 600, color: "secondary.main" } as const;

function inForcePowerOf(coefficient: PartitionCoefficientResponse, powerByAgreementId: ReadonlyMap<string, InForceAgreementPower>) {
  const line = formatInForcePowerLine(
    coefficient.coefficient,
    powerByAgreementId.get(coefficient.sharingAgreement.id) ?? { status: "loading" },
  );
  return line ?? <Skeleton variant="text" aria-label="Cargando potencia vigente" sx={{ display: "inline-block", width: 72 }} />;
}

/**
 * The supplies this draft drops from the distribution. The draft always sums
 * to 100 %, so without this list nothing on screen shows that a member was
 * taken out.
 *
 * Read-only on purpose: re-adding a supply is done in the editor. Not affected
 * by the search box, which filters the draft's rows only. Rendered only when
 * there is something to list, or when the list could not be read.
 */
export const SharingAgreementOutgoingSupplies: FC<SharingAgreementOutgoingSuppliesProps> = ({
  outgoing,
  isError,
  onRetry,
  powerByAgreementId,
}) => {
  if (isError) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 2 }}
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        }
      >
        No se han podido cargar los puntos que salen del reparto.
      </Alert>
    );
  }

  if (outgoing.length === 0) return null;

  const title = `Salen del reparto (${outgoing.length})`;

  return (
    <Accordion
      defaultExpanded
      disableGutters
      elevation={0}
      sx={{
        mt: 2,
        border: `1px solid ${colors.border.light}`,
        borderRadius: radii.default,
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.text.secondary }}>
            Tienen un coeficiente en vigor y no están en este borrador.
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {/* Desktop table */}
        <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
          <Table size="small" aria-label={title}>
            <TableHead>
              <TableRow sx={{ backgroundColor: colors.background.surface }}>
                <TableCell>
                  <Typography variant="subtitle2" sx={HEADER_SX}>
                    Punto
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" sx={HEADER_SX}>
                    CUPS
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" sx={HEADER_SX}>
                    Coeficiente
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" sx={HEADER_SX}>
                    Potencia asignada
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outgoing.map((coefficient) => {
                const identity = getRowIdentity(coefficient.supply);
                return (
                  <TableRow key={coefficient.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {identity.primary}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {identity.secondary !== null && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {identity.secondary}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                        Vigente {formatCoefficientPercentage(coefficient.coefficient)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                        {inForcePowerOf(coefficient, powerByAgreementId)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Mobile stacked cards */}
        <Box component="ul" aria-label={title} sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column", listStyle: "none", m: 0, p: 0 }}>
          {outgoing.map((coefficient) => {
            const identity = getRowIdentity(coefficient.supply);
            return (
              <Box
                component="li"
                key={coefficient.id}
                sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 1.5, borderBottom: `1px solid ${colors.divider}` }}
              >
                <Typography variant="body2" fontWeight="600" sx={{ fontVariantNumeric: "tabular-nums", wordBreak: "break-word" }}>
                  {identity.primary}
                </Typography>
                {identity.secondary !== null && (
                  <Typography variant="caption" sx={{ color: colors.text.secondary, fontVariantNumeric: "tabular-nums" }}>
                    {identity.secondary}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                  Vigente {formatCoefficientPercentage(coefficient.coefficient)}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                  {inForcePowerOf(coefficient, powerByAgreementId)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
