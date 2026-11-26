import { useRef, useState, type FC, type ReactNode } from "react";
import { Box, Link, Skeleton } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { Link as RouterLink, useParams } from "react-router";
import { BreadCrumb } from "../../../components/Breadcrumb";
import { DetailHeader } from "../../../components/DetailHeader";
import { EmptyState } from "../../../components/EmptyState";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { usePlantActions } from "../../../hooks/actions";
import { useOverlayOpener } from "../../../hooks/useOverlayOpener";
import { sxStyles } from "../../../theme/sx";
import type { PlantResponse, PlantSurplusClaimResponse } from "../../../api/models";
import { SURPLUS_CLAIM_ICON } from "../plantDetail/sectionIcons";
import { PlantFormDialog } from "../PlantFormDialog";
import { SurplusClaimDownload } from "./SurplusClaimDownload";
import { SurplusClaimDays } from "./SurplusClaimDays";
import { SurplusClaimSummary } from "./SurplusClaimSummary";
import { SurplusClaimWarnings } from "./SurplusClaimWarnings";
import { claimMonthOptions, monthPhrase, raisedWarnings } from "./surplusClaimFormat";
import { useClaimMonthParam } from "./useClaimMonthParam";
import { usePlantSurplusClaimData } from "./usePlantSurplusClaimData";

const LoadingState: FC = () => (
  <>
    <Box sx={sxStyles.pageContainer}>
      <Box sx={sxStyles.softPanel}>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={160} />
      </Box>
    </Box>
    <Box sx={sxStyles.pageContainer}>
      <Box sx={sxStyles.softPanel}>
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <Skeleton key={row} variant="rounded" height={44} sx={{ mb: 1.5 }} />
        ))}
      </Box>
    </Box>
  </>
);

interface ClaimViewProps {
  plant: PlantResponse;
  claim: PlantSurplusClaimResponse;
  isSwitchingMonth: boolean;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

const ClaimView: FC<ClaimViewProps> = ({ plant, claim, isSwitchingMonth, selectedMonth, onMonthChange }) => {
  const warningsRef = useRef<HTMLElement>(null);
  const warnings = raisedWarnings(claim, plant.nominalPowerKW);
  // "Añadir CIL" opens the plant's own edit form over the page; saving it
  // reads the claim again, which carries the CIL (UI-SCL-010).
  const { edit } = usePlantActions().forPlant(plant).actions;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const editOpener = useOverlayOpener(isEditOpen);

  const showWarnings = () => {
    const area = warningsRef.current;
    area?.scrollIntoView({ behavior: "smooth", block: "start" });
    area?.focus({ preventScroll: true });
  };

  return (
    <>
      <Box sx={sxStyles.pageContainer}>
        <SurplusClaimSummary
          claim={claim}
          selectedMonth={selectedMonth}
          monthOptions={claimMonthOptions(claim.month, claim.availableMonths)}
          onMonthChange={onMonthChange}
          warningCount={warnings.length}
          onShowWarnings={showWarnings}
          actions={
            <SurplusClaimDownload
              plant={plant}
              claim={claim}
              isSwitchingMonth={isSwitchingMonth}
              warnings={warnings}
              onAddCil={(opener) => {
                if (!edit) return;
                editOpener.record(opener);
                setIsEditOpen(true);
              }}
            />
          }
        />
      </Box>
      {isEditOpen && edit && (
        <PlantFormDialog target={{ kind: "edit", plantId: plant.id }} onClose={() => setIsEditOpen(false)} />
      )}
      {warnings.length > 0 && (
        <Box sx={sxStyles.pageContainer}>
          <SurplusClaimWarnings ref={warningsRef} warnings={warnings} monthPhrase={monthPhrase(claim.month)} />
        </Box>
      )}
      <Box sx={sxStyles.pageContainer}>
        {/* Keyed on the month: a day opened in one month is not opened in the next. */}
        <SurplusClaimDays key={claim.month} claim={claim} nominalPowerKW={plant.nominalPowerKW} />
      </Box>
    </>
  );
};

/**
 * A plant's surplus claim (#455): the surplus of one closed month, hour by
 * hour, reviewed before downloading the file sent to the retailer. The month
 * lives in the address (UI-SCL-001).
 */
export const PlantSurplusClaimPage: FC = () => {
  const { plantId = "" } = useParams();
  const monthParam = useClaimMonthParam();
  const { plant, claim, isLoading, isSwitchingMonth, isNotFound, error, refetch } = usePlantSurplusClaimData(
    plantId,
    monthParam.month,
    monthParam.drop,
  );

  let body: ReactNode;
  if (error) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <LoadErrorAlert message="No se pudo cargar la reclamación de excedentes." onRetry={refetch} />
      </Box>
    );
  } else if (isLoading || !plant || !claim) {
    body = <LoadingState />;
  } else {
    body = (
      <ClaimView
        plant={plant}
        claim={claim}
        isSwitchingMonth={isSwitchingMonth}
        selectedMonth={monthParam.month ?? claim.month}
        onMonthChange={monthParam.select}
      />
    );
  }

  return (
    <Box sx={sxStyles.pageRoot}>
      <Box sx={{ ...sxStyles.pageContainer, pt: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Plantas", href: "/plants" },
            { label: plant?.name || "Planta", href: `/plants/${plantId}` },
            { label: "Reclamación de excedentes", href: "#" },
          ]}
        />
      </Box>

      {isNotFound ? (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Planta no encontrada"
            subtitle="Esta planta no existe o no tienes acceso a su comunidad."
          />
        </Box>
      ) : (
        <>
          <Box sx={sxStyles.pageContainer}>
            <DetailHeader
              icon={<SURPLUS_CLAIM_ICON />}
              title="Reclamación de excedentes"
              subtitle={
                <>
                  {plant && (
                    <>
                      <Link component={RouterLink} to={`/plants/${plantId}`}>
                        {plant.name}
                      </Link>
                      {" · "}
                    </>
                  )}
                  Revisa el excedente del mes antes de descargar el fichero que envías a la comercializadora.
                </>
              }
              isLoading={isLoading && !plant}
            />
          </Box>
          {body}
        </>
      )}
    </Box>
  );
};
