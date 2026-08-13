import type { ChipProps } from "@mui/material";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";

export function getSharingAgreementStatusLabel(status: StatusValue | undefined): string {
  switch (status) {
    case SharingAgreementResponseStatus.DRAFT:
      return "Borrador";
    case SharingAgreementResponseStatus.PUBLISHED:
      return "Vigente";
    case SharingAgreementResponseStatus.SUPERSEDED:
      return "Histórico";
    default:
      return "Desconocido";
  }
}

export function getSharingAgreementStatusColor(status: StatusValue | undefined): ChipProps["color"] {
  switch (status) {
    case SharingAgreementResponseStatus.DRAFT:
      return "warning";
    case SharingAgreementResponseStatus.PUBLISHED:
      return "primary";
    case SharingAgreementResponseStatus.SUPERSEDED:
      return "default";
    default:
      return "default";
  }
}
