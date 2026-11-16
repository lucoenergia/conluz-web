import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildMembership } from "../../test/fixtures";
import type { MembershipResponse } from "../../api/models";
import { transferStateLabel } from "../../pages/supply-points/supplyTransfer";
import { MemberPicker, type MemberPickerProps } from "./MemberPicker";
import { isMemberPickerUnavailable, memberPickerOptions } from "./memberPickerOptions";

const OWNER = buildMembership({ id: "m-ana", user: { id: "u-ana" }, fullName: "Ana García", personalId: "11111111H" });
const ACTIVE = buildMembership({ id: "m-luis", user: { id: "u-luis" }, fullName: "Luis Pérez", personalId: "22222222J" });
// Pending in two different sub-states: invited with a usable link, and never invited.
const PENDING_INVITED = buildMembership({
  id: "m-beatriz",
  user: { id: "u-beatriz" },
  fullName: "Beatriz Ruiz",
  personalId: "33333333P",
  acceptedAt: null,
  invitedAt: "2026-11-01T10:00:00Z",
  invitationExpiresAt: "2026-11-30T10:00:00Z",
});
const PENDING_NOT_INVITED = buildMembership({
  id: "m-carmen",
  user: { id: "u-carmen" },
  fullName: "Carmen Soto",
  personalId: "44444444A",
  acceptedAt: null,
});
const SUSPENDED = buildMembership({
  id: "m-diego",
  user: { id: "u-diego" },
  fullName: "Diego Vidal",
  personalId: "55555555K",
  enabled: false,
});
// In the order the screen hands them over, which the picker keeps.
const ROSTER = [SUSPENDED, OWNER, PENDING_NOT_INVITED, ACTIVE, PENDING_INVITED];

const EMPTY = "TEST-EMPTY-TEXT";
const FAILED = "TEST-ERROR-TEXT";

function renderPicker(props: Partial<MemberPickerProps> = {}) {
  const onChange = vi.fn();
  renderWithProviders(
    <MemberPicker
      options={ROSTER}
      status="ready"
      value={null}
      onChange={onChange}
      label="Nuevo titular"
      emptyText={EMPTY}
      errorText={FAILED}
      {...props}
    />,
  );
  return { onChange };
}

const picker = () => screen.getByRole("combobox", { name: /^Nuevo titular/ });

async function optionTexts() {
  await userEvent.click(picker());
  return (await screen.findAllByRole("option")).map((option) => option.textContent);
}

const isOwner = (membership: MembershipResponse) => membership.user.id === OWNER.user.id;

describe("MemberPicker", () => {
  it("UI-SUP-016 offers the options in the order it is given, labelled by name and personal ID", async () => {
    renderPicker();

    expect(await optionTexts()).toEqual([
      "Diego Vidal (55555555K)",
      "Ana García (11111111H)",
      "Carmen Soto (44444444A)",
      "Luis Pérez (22222222J)",
      "Beatriz Ruiz (33333333P)",
    ]);
  });

  it("UI-SUP-025 leaves out an excluded member and keeps the order of the rest", async () => {
    renderPicker({ exclude: isOwner });

    expect(await optionTexts()).toEqual([
      "Diego Vidal (55555555K)",
      "Carmen Soto (44444444A)",
      "Luis Pérez (22222222J)",
      "Beatriz Ruiz (33333333P)",
    ]);
  });

  it("UI-SUP-025 labels every pending member \"Pendiente\" and a suspended one \"Suspendido\", never a sub-state, and an active one not at all", async () => {
    renderPicker({ exclude: isOwner, stateLabel: transferStateLabel });

    expect(await optionTexts()).toEqual([
      "Diego Vidal (55555555K)· Suspendido",
      "Carmen Soto (44444444A)· Pendiente",
      "Luis Pérez (22222222J)",
      "Beatriz Ruiz (33333333P)· Pendiente",
    ]);
    expect(screen.queryByText(/Sin invitar|Invitación enviada/)).not.toBeInTheDocument();
  });

  it("hands the chosen membership to the screen", async () => {
    const { onChange } = renderPicker({ exclude: isOwner });

    await userEvent.click(picker());
    await userEvent.click(await screen.findByRole("option", { name: "Luis Pérez (22222222J)" }));

    expect(onChange).toHaveBeenCalledWith(ACTIVE);
  });

  it("shows nothing chosen for a value it does not offer", () => {
    renderPicker({ exclude: isOwner, value: OWNER.id });

    expect(picker()).toHaveValue("");
  });

  it("UI-SUP-017 says when an exclusion leaves nobody to offer", () => {
    renderPicker({ options: [OWNER], exclude: isOwner });

    expect(screen.getByText(EMPTY)).toBeVisible();
  });

  it("UI-SUP-017 says when the roster could not be read, as an error", () => {
    renderPicker({ status: "error", options: [] });

    expect(screen.getByText(FAILED)).toBeVisible();
    expect(picker()).toHaveAttribute("aria-invalid", "true");
  });

  it("UI-SUP-009 shows a refusal on the input in place of any notice", () => {
    renderPicker({ options: [], error: "TEST-REFUSAL" });

    expect(picker()).toHaveAccessibleDescription("TEST-REFUSAL");
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
  });

  it("UI-SUP-017 counts a roster as unavailable while loading, failed, or leaving nobody", () => {
    expect(isMemberPickerUnavailable("loading", ROSTER)).toBe(true);
    expect(isMemberPickerUnavailable("error", ROSTER)).toBe(true);
    expect(isMemberPickerUnavailable("ready", memberPickerOptions([OWNER], isOwner))).toBe(true);
    expect(isMemberPickerUnavailable("ready", memberPickerOptions(ROSTER, isOwner))).toBe(false);
  });
});
