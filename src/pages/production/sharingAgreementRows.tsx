import { Box, Typography } from "@mui/material";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import type { SharingAgreementRowActions } from "../../hooks/actions/useSharingAgreementActions";
import type { RecordListItem } from "../../components/RecordList";
import type { ListTableColumn, ListTableTitle } from "../../components/ListTable/ListTable";
import { SharingAgreementStatusChip } from "../../components/SharingAgreementStatusChip";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";

/**
 * A plant's sharing agreement list, in its two layouts, built from the same
 * agreement (#350). Only what the list response carries is shown
 * (UI-AGR-015): no supply count and no coefficient sum, which it does not
 * have. The rows keep the API's order, newest first.
 */

/**
 * The row's one action, deleting, resolved once for the kebab and its menu:
 * the caller's `remove`, and only on a draft. The agreement carries no
 * per-agreement delete capability, so its `canManage` (behind `remove`) is
 * paired with the status here, and nowhere else.
 */
export function deletableFromRow(
  agreement: SharingAgreementResponse | undefined,
  { actions }: SharingAgreementRowActions,
): SharingAgreementRowActions["actions"]["remove"] {
  return agreement?.status === SharingAgreementResponseStatus.DRAFT ? actions.remove : undefined;
}

/** Whether an agreement's row has a menu. The title already links to the detail, so there is no "Ver". */
export function offersSharingAgreementRowActions(
  agreement: SharingAgreementResponse,
  rowActions: SharingAgreementRowActions,
): boolean {
  return !!deletableFromRow(agreement, rowActions);
}

export const sharingAgreementHref = (plantId: string) => (agreement: SharingAgreementResponse) =>
  `/production/${plantId}/sharing-agreements/${agreement.id}`;

/** The last edit, or the creation when it was never edited, as its label and its date. */
const editedParts = (agreement: SharingAgreementResponse) =>
  agreement.updatedAt
    ? { label: "Editado el", date: formatCalendarDate(agreement.updatedAt, SHORT_CALENDAR_DATE) }
    : { label: "Creado el", date: formatCalendarDate(agreement.createdAt, SHORT_CALENDAR_DATE) };

export const editedText = (agreement: SharingAgreementResponse) => {
  const { label, date } = editedParts(agreement);
  return `${label} ${date}`;
};

/** The evidence file, or a neutral "Sin fichero": an agreement without one yet is not an error. */
export const fileText = (agreement: SharingAgreementResponse) =>
  agreement.file
    ? `Fichero: ${agreement.file.filename} · subido el ${formatCalendarDate(agreement.file.uploadedAt, SHORT_CALENDAR_DATE)}`
    : "Sin fichero";

/** The notes on one line, cut with an ellipsis: the detail page shows them whole. */
const notesLine = (notes: string) => (
  <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
    {notes}
  </Box>
);

const notesLines = (agreement: SharingAgreementResponse) => (agreement.notes ? [notesLine(agreement.notes)] : []);

/** The narrow layout's row. */
export const toRecordListItem =
  (plantId: string) =>
  (agreement: SharingAgreementResponse): RecordListItem => ({
    id: agreement.id,
    title: agreement.name,
    href: sharingAgreementHref(plantId)(agreement),
    status: <SharingAgreementStatusChip status={agreement.status} />,
    lines: [
      `${formatKilowatts(agreement.installedPowerKw)} · ${editedText(agreement)}`,
      fileText(agreement),
      ...notesLines(agreement),
    ],
  });

/**
 * The wide layout's name column: the name, linked, with the file and the notes
 * under it. At a 1024px viewport with the side menu open, columns of their own
 * would leave the name too little room (UI-LST-001).
 */
export const sharingAgreementTableTitle = (plantId: string): ListTableTitle<SharingAgreementResponse> => ({
  header: "Acuerdo",
  text: (agreement) => agreement.name,
  href: sharingAgreementHref(plantId),
  secondary: (agreement) => [fileText(agreement), ...notesLines(agreement)],
});

/** Room for the widest chip, "Histórico" with its icon, padding included. */
const STATUS_COLUMN_WIDTH = "136px";
const POWER_COLUMN_WIDTH = "112px";
/** "Editado el 20 sept 2024" wraps after its label, rather than taking room from the name. */
const DATE_COLUMN_WIDTH = "136px";

/** The wide layout's columns. */
export const sharingAgreementTableColumns: ListTableColumn<SharingAgreementResponse>[] = [
  {
    key: "status",
    header: "Estado",
    width: STATUS_COLUMN_WIDTH,
    render: (agreement) => <SharingAgreementStatusChip status={agreement.status} />,
  },
  {
    key: "power",
    header: "Potencia",
    width: POWER_COLUMN_WIDTH,
    render: (agreement) => <Typography variant="body2">{formatKilowatts(agreement.installedPowerKw)}</Typography>,
  },
  {
    key: "date",
    header: "Fecha",
    width: DATE_COLUMN_WIDTH,
    render: (agreement) => {
      const { label, date } = editedParts(agreement);
      return (
        <Typography variant="body2">
          {label}{" "}
          {/* The date never splits across lines; the label wraps before it. */}
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>
            {date}
          </Box>
        </Typography>
      );
    },
  },
];
