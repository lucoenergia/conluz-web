import type { FC } from "react";
import { Box, Link } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router";
import { BreadCrumb } from "../../../components/Breadcrumb";
import { DetailHeader } from "../../../components/DetailHeader";
import { sxStyles } from "../../../theme/sx";
import { SURPLUS_CLAIM_ICON } from "../plantDetail/sectionIcons";
import { usePlantInActiveCommunity } from "../usePlantInActiveCommunity";

/**
 * A plant's surplus claim (#455): the surplus of one closed month, hour by
 * hour, reviewed before downloading the file sent to the retailer.
 */
export const PlantSurplusClaimPage: FC = () => {
  const { plantId = "" } = useParams();
  const { plant, isLoading } = usePlantInActiveCommunity(plantId);

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
              Revisa el excedente del mes antes de descargar el fichero que
              envías a la comercializadora.
            </>
          }
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );
};
