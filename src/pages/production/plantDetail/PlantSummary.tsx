import { useMemo, type FC } from "react";
import { Box, ButtonBase, Typography, type SvgIconProps } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import type { PlantResponse } from "../../../api/models";
import { colors, fontSizes, radii } from "../../../theme/tokens";
import { sxStyles } from "../../../theme/sx";
import { usePlantSharingAgreements } from "../../home/management/usePlantSharingAgreements";
import { computeSharingAgreementCounts } from "../useSharingAgreementsData";
import { agreementsSummaryText } from "./agreementsSummary";
import { AGREEMENTS_ICON, INTEGRATIONS_ICON } from "./sectionIcons";
import { PLANT_SECTION_IDS, scrollToSection, type PlantSectionId } from "./plantSections";
import type { PlantIntegrationStatus } from "./usePlantIntegrationStatus";

type StatusTone = "positive" | "neutral";

/**
 * A status pill. Neither tone is an alert: a plant that is not set up yet is in
 * a normal state, and alert colour is kept for failures (UI-PLT-006).
 */
const TONE_SX: Record<StatusTone, object> = {
  positive: { bgcolor: colors.success.surface, color: colors.success.main },
  neutral: { bgcolor: colors.background.surface, color: colors.secondary.main, border: `1px solid ${colors.border.light}` },
};

interface SummaryRowProps {
  label: string;
  /** The icon of the section the row leads to, so the two read as one. */
  icon: FC<SvgIconProps>;
  /** Absent while the status is unknown: the row then claims nothing. */
  status?: { text: string; tone: StatusTone };
  target: PlantSectionId;
}

const SummaryRow: FC<SummaryRowProps> = ({ label, icon: Icon, status, target }) => (
  // A divider between rows, never above the first.
  <Box component="li" sx={{ "& + &": { borderTop: `1px solid ${colors.divider}` } }}>
    <ButtonBase
      onClick={() => scrollToSection(target)}
      aria-label={status ? `${label}: ${status.text}` : label}
      sx={{
        width: "100%",
        minHeight: 56,
        px: 1,
        py: 1.25,
        gap: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "left",
        borderRadius: radii.default,
        "&:hover": { bgcolor: colors.background.surface },
        "&.Mui-focusVisible": { outline: `2px solid ${colors.brand.main}`, outlineOffset: 2 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: "50%",
          bgcolor: colors.brand.surface,
          color: colors.brand.main,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Typography component="span" sx={{ flex: 1, minWidth: 0, fontWeight: 600, color: colors.text.primary }}>
        {label}
      </Typography>
      {status && (
        <Typography
          component="span"
          sx={{
            px: 1.25,
            py: 0.25,
            borderRadius: radii.large,
            fontSize: fontSizes.sm,
            fontWeight: 600,
            whiteSpace: "nowrap",
            ...TONE_SX[status.tone],
          }}
        >
          {status.text}
        </Typography>
      )}
      <ChevronRightRoundedIcon aria-hidden fontSize="small" sx={{ color: colors.text.muted, flexShrink: 0 }} />
    </ButtonBase>
  </Box>
);

/** Mounted only for a caller who may list the plant's agreements: it is what issues the read. */
const AgreementsRow: FC<{ plant: PlantResponse }> = ({ plant }) => {
  const { agreements } = usePlantSharingAgreements(plant);
  const status = useMemo(() => {
    if (!agreements) return undefined;
    const counts = computeSharingAgreementCounts(agreements);
    return { text: agreementsSummaryText(counts), tone: counts.vigentes > 0 ? "positive" : "neutral" } as const;
  }, [agreements]);
  return (
    <SummaryRow label="Acuerdos de reparto" icon={AGREEMENTS_ICON} status={status} target={PLANT_SECTION_IDS.agreements} />
  );
};

const INTEGRATION_STATUS: Partial<Record<PlantIntegrationStatus, SummaryRowProps["status"]>> = {
  active: { text: "Activa", tone: "positive" },
  disabled: { text: "Desactivada", tone: "neutral" },
  "not-configured": { text: "Sin configurar", tone: "neutral" },
};

export interface PlantSummaryProps {
  plant: PlantResponse | undefined;
  integrationStatus: PlantIntegrationStatus;
}

/**
 * "En esta planta": one row per section of the plant the caller may see, each
 * with that section's status and a jump to it, so a phone shows what needs
 * attention without scrolling past production (UI-PLT-002, UI-PLT-003).
 * With no row to show, the block is not rendered at all.
 *
 * It shows no title: under the plant's own header, its rows say what they are.
 * The name stays for assistive technology, which announces the region.
 */
export const PlantSummary: FC<PlantSummaryProps> = ({ plant, integrationStatus }) => {
  const showAgreements = plant?.capabilities.canListSharingAgreements === true;
  const showIntegration = plant?.capabilities.canManage === true;
  if (!plant || (!showAgreements && !showIntegration)) return null;

  return (
    <Box component="section" aria-label="En esta planta" sx={{ ...sxStyles.softPanel, py: { xs: 1, sm: 1.5 } }}>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {showAgreements && <AgreementsRow plant={plant} />}
        {showIntegration && (
          <SummaryRow
            label="Integración Huawei"
            icon={INTEGRATIONS_ICON}
            status={INTEGRATION_STATUS[integrationStatus]}
            target={PLANT_SECTION_IDS.integrations}
          />
        )}
      </Box>
    </Box>
  );
};
