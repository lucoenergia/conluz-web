import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCoefficient, buildCommunity, buildUser } from "../../test/fixtures";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { useUploadSharingAgreementFile } from "../../api/sharing-agreements/sharing-agreements";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { ApplyCoefficientDateConfirmationModal } from "../../components/Modals/ApplyCoefficientDateConfirmationModal";
import { CorrectCoefficientDateConfirmationModal } from "../../components/Modals/CorrectCoefficientDateConfirmationModal";
import { DeactivateOrReopenCoefficientConfirmationModal } from "../../components/Modals/DeactivateOrReopenCoefficientConfirmationModal";
import { CloseCoefficientConfirmationModal } from "../../components/Modals/CloseCoefficientConfirmationModal";
import { PublishSharingAgreementConfirmationModal } from "../../components/Modals/PublishSharingAgreementConfirmationModal";
import { RevertSharingAgreementToDraftConfirmationModal } from "../../components/Modals/RevertSharingAgreementToDraftConfirmationModal";
import { DeleteSharingAgreementConfirmationModal } from "../../components/Modals/DeleteSharingAgreementConfirmationModal";
import { SharingAgreementFormDialog } from "../../components/SharingAgreementFormDialog";
import { SharingAgreementUploadDialog } from "../../components/SharingAgreementUploadDialog";

/**
 * AC9 (#186): every surface that confirms a write changing a community's
 * distribution coefficients names that community, in its header line and in
 * its title.
 */

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
}));

vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUploadSharingAgreementFile: vi.fn(),
}));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildUser({ id: "admin", memberships: { c1: "COMMUNITY_ADMIN" } }),
}));

const COMMUNITY = "Comunidad Solar Norte";

const coefficients: [SharingAgreementPartitionCoefficientResponse] = [buildCoefficient()];
const coefficientProps = { isOpen: true, coefficients, isPending: false, errorMessages: null, onCancel: vi.fn() };
const agreementProps = { isOpen: true, agreementName: "Reparto bloque A", onCancel: vi.fn(), onConfirm: vi.fn() };

beforeEach(() => {
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([buildCommunity({ id: "c1", name: COMMUNITY })]),
  );
  vi.mocked(useUploadSharingAgreementFile).mockReturnValue(mutation.idle());
});

const surfaces: Array<[string, ReactElement]> = [
  [`Registrar fecha de aplicación en ${COMMUNITY}`, <ApplyCoefficientDateConfirmationModal {...coefficientProps} onConfirm={vi.fn()} />],
  [`Corregir fecha de aplicación en ${COMMUNITY}`, <CorrectCoefficientDateConfirmationModal {...coefficientProps} onConfirm={vi.fn()} />],
  [
    `Desactivar coeficiente en ${COMMUNITY}`,
    <DeactivateOrReopenCoefficientConfirmationModal {...coefficientProps} action="deactivate" onConfirm={vi.fn()} />,
  ],
  [
    `Reabrir coeficiente en ${COMMUNITY}`,
    <DeactivateOrReopenCoefficientConfirmationModal {...coefficientProps} action="reopen" onConfirm={vi.fn()} />,
  ],
  [`Cerrar coeficiente en ${COMMUNITY}`, <CloseCoefficientConfirmationModal {...coefficientProps} onConfirm={vi.fn()} />],
  [
    `Poner en vigor en ${COMMUNITY}`,
    <PublishSharingAgreementConfirmationModal {...agreementProps} fileSumLabel="1,000000" coefficientCount={3} />,
  ],
  [`Volver a borrador en ${COMMUNITY}`, <RevertSharingAgreementToDraftConfirmationModal {...agreementProps} />],
  [`Eliminar acuerdo de reparto de ${COMMUNITY}`, <DeleteSharingAgreementConfirmationModal {...agreementProps} />],
  [
    `Nuevo acuerdo de reparto en ${COMMUNITY}`,
    <SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={vi.fn()} />,
  ],
  [
    `Editar acuerdo de reparto en ${COMMUNITY}`,
    <SharingAgreementFormDialog
      isOpen
      mode="edit"
      initialValues={{ name: "Reparto bloque A", installedPowerKw: 10 }}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />,
  ],
  [
    `Importar un fichero que ya tengas en ${COMMUNITY}`,
    <SharingAgreementUploadDialog
      isOpen
      plantId="plant-1"
      sharingAgreementId="agreement-1"
      regulatoryCode="CAU0001"
      onClose={vi.fn()}
    />,
  ],
];

describe("coefficient and agreement confirmations name the community (AC9)", () => {
  test.each(surfaces)("%s", (title, surface) => {
    renderWithProviders(surface, { activeCommunityId: "c1" });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(`Comunidad · ${COMMUNITY}`)).toBeInTheDocument();
  });
});
