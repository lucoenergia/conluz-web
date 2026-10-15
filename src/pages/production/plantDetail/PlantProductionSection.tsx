import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import SolarPowerOutlinedIcon from "@mui/icons-material/SolarPowerOutlined";
import { EmptyState } from "../../../components/EmptyState";
import { GraphBar } from "../../../components/Graph/GraphBar";
import { LoadingGraphCard } from "../../../components/Graph/LoadingGraphCard";
import { colors } from "../../../theme/tokens";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { PeriodControl } from "./PeriodControl";
import { PlantSection } from "./PlantSection";
import { PLANT_SECTION_IDS, scrollToSection } from "./plantSections";
import type { PlantIntegrationStatus } from "./usePlantIntegrationStatus";

/** Amber, as the member home's "Energía asignada": `main` carries the figure as type. */
const PRODUCTION_ACCENT = { main: colors.warning.main, surface: colors.warning.surface };

export interface PlantProductionSectionProps {
  handlePeriodChange: (startDate: Date, endDate: Date) => void;
  isLoading: boolean;
  /** A failed read is reported by the page; it is never shown as an empty period. */
  hasError: boolean;
  /** Whether any row of the period carries a figure; see the page for what counts. */
  hasData: boolean;
  total: number;
  /** Change against the previous period, as a percentage, when there is one to compare with. */
  trend: number | undefined;
  values: number[];
  categories: string[];
  subtitle: string;
  /**
   * The integration's status, known only to a caller who may manage the plant:
   * for anyone else it is `unknown`, and the empty state says nothing about
   * configuration (UI-PLT-005).
   */
  integrationStatus: PlantIntegrationStatus;
}

const NoDataState: FC<{ integrationStatus: PlantIntegrationStatus }> = ({ integrationStatus }) => {
  const toIntegrations = { label: "Ir a integraciones", onClick: () => scrollToSection(PLANT_SECTION_IDS.integrations) };
  if (integrationStatus === "not-configured") {
    return (
      <EmptyState
        icon={SolarPowerOutlinedIcon}
        title="Todavía no llegan datos de producción"
        subtitle="La integración con Huawei de esta planta no está configurada."
        actionButton={toIntegrations}
      />
    );
  }
  if (integrationStatus === "disabled") {
    return (
      <EmptyState
        icon={SolarPowerOutlinedIcon}
        title="Todavía no llegan datos de producción"
        subtitle="La integración con Huawei de esta planta está desactivada."
        actionButton={toIntegrations}
      />
    );
  }
  return (
    <EmptyState
      icon={SolarPowerOutlinedIcon}
      title="No hay datos de producción para este periodo"
      subtitle="Prueba con otro periodo."
    />
  );
};

/**
 * The plant's production for the selected period: the total as the headline
 * figure and a bar per hour, day, month or year. A period without data shows
 * an empty state instead of a zero and an empty chart (UI-PLT-005).
 */
export const PlantProductionSection: FC<PlantProductionSectionProps> = ({
  handlePeriodChange,
  isLoading,
  hasError,
  hasData,
  total,
  trend,
  values,
  categories,
  subtitle,
  integrationStatus,
}) => (
  <PlantSection
    title="Producción"
    description="Energía que ha producido esta planta en el periodo elegido."
    icon={SolarPowerOutlinedIcon}
    accent={PRODUCTION_ACCENT}
  >
    <PeriodControl handleChange={handlePeriodChange} />
    <Box sx={{ mt: 2 }}>
      {isLoading && <LoadingGraphCard />}
      {!isLoading && !hasError && !hasData && <NoDataState integrationStatus={integrationStatus} />}
      {!isLoading && !hasError && hasData && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="h4" component="p" sx={{ fontWeight: 700, color: PRODUCTION_ACCENT.main }}>
            {formatKilowattHours(total)}
          </Typography>
          {trend !== undefined && (
            <Typography variant="body2" sx={{ color: colors.text.body }}>
              {`${trend > 0 ? "+" : ""}${Math.round(trend)} % frente al periodo anterior`}
            </Typography>
          )}
          <Typography component="h3" variant="subtitle2" sx={{ mt: 1, color: colors.text.secondary }}>
            {subtitle}
          </Typography>
          <Box sx={{ height: 280 }}>
            <GraphBar title="Producción" categories={categories} data={values} variant="production" />
          </Box>
        </Box>
      )}
    </Box>
  </PlantSection>
);
