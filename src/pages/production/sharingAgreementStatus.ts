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
