import { Box, Typography } from "@mui/material";
import type { PlantResponse } from "../../api/models";
import type { PlantRowActions } from "../../hooks/actions/usePlantActions";
import type { RecordListItem } from "../../components/RecordList";
import type { ListTableColumn, ListTableTitle } from "../../components/ListTable/ListTable";
import { fontFamilies } from "../../theme/tokens";
import { formatKilowatts, formatKilowattsPeak } from "../../utils/formatKilowatts";
import { inverterProviderLabel } from "../../utils/inverterProviderLabel";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";

/**
 * The plant list's two layouts, built from the same plant (#349). Only what
 * identifies the plant to a person is shown (UI-PLS-001): no production
 * figure, no integration status, no description, and not the provider's
 * station code, which is an integration key.
 *
 * A value the plant does not have yet is neutral text: a plant still being set
 * up is not an error.
 */

/**
 * Whether a plant's row has a menu: an action the caller was given. "Ver" does
 * not count, because the row's title already links to the detail.
 */
export function offersPlantRowActions(plant: PlantResponse, { actions }: PlantRowActions): boolean {
  return !!(actions.edit || actions.remove || plant.capabilities.canListSharingAgreements);
}

export const plantHref = (plant: PlantResponse) => `/plants/${plant.id}`;

const cauCode = (code: string) => (
  <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
    {code}
  </Box>
);

const connectionDateText = (plant: PlantResponse) =>
  plant.connectionDate ? formatCalendarDate(plant.connectionDate, SHORT_CALENDAR_DATE) : undefined;

/** Both powers, told apart by their units: "120,5 kWp · 100 kW". */
const powerText = (plant: PlantResponse) =>
  `${formatKilowattsPeak(plant.peakPowerKWp)} · ${formatKilowatts(plant.nominalPowerKW)}`;

const inverterText = (plant: PlantResponse) => `Inversor ${inverterProviderLabel(plant.inverterProvider)}`;

/** The narrow layout's row. */
export function toRecordListItem(plant: PlantResponse): RecordListItem {
  const connectionDate = connectionDateText(plant);
  return {
    id: plant.id,
    title: plant.name,
    href: plantHref(plant),
    lines: [
      plant.regulatoryCode ? <>CAU {cauCode(plant.regulatoryCode)}</> : "Sin CAU",
      `${powerText(plant)} · ${inverterText(plant)}`,
      connectionDate ? `Conectada el ${connectionDate}` : "Sin fecha de conexión",
      plant.address,
    ],
  };
}

/**
 * The wide layout's name column: the name, linked, with the address under it.
 * The inverter goes under it too: at a 1024px viewport with the side menu
 * open, a column of its own leaves the name too little room (UI-LST-001).
 */
export const plantTableTitle: ListTableTitle<PlantResponse> = {
  header: "Planta",
  text: (plant) => plant.name,
  href: plantHref,
  secondary: (plant) => [plant.address, inverterText(plant)],
};

/** Room for a 22-character CAU in the mono stack, padding included. */
const CAU_COLUMN_WIDTH = "224px";
/** Room for "12.840,25 kWp", the longest power the layout budget checks. */
const POWER_COLUMN_WIDTH = "112px";
const CONNECTION_COLUMN_WIDTH = "112px";

/** The wide layout's columns. */
export const plantTableColumns: ListTableColumn<PlantResponse>[] = [
  {
    key: "cau",
    header: "CAU",
    width: CAU_COLUMN_WIDTH,
    render: (plant) =>
      plant.regulatoryCode ? (
        <Typography variant="body2" sx={{ fontFamily: fontFamilies.mono }}>
          {plant.regulatoryCode}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Sin CAU
        </Typography>
      ),
  },
  {
    key: "power",
    header: "Potencia",
    width: POWER_COLUMN_WIDTH,
    // The peak power over the nominal power, each with its unit.
    render: (plant) => (
      <>
        <Typography variant="body2">{formatKilowattsPeak(plant.peakPowerKWp)}</Typography>
        <Typography variant="body2">{formatKilowatts(plant.nominalPowerKW)}</Typography>
      </>
    ),
  },
  {
    key: "connection",
    header: "Conexión",
    width: CONNECTION_COLUMN_WIDTH,
    render: (plant) => {
      const connectionDate = connectionDateText(plant);
      return connectionDate ? (
        <Typography variant="body2">{connectionDate}</Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Sin fecha de conexión
        </Typography>
      );
    },
  },
];
