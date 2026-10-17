import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildMembership, buildUser } from "../../test/fixtures";
import { CommunityRole } from "../../api/models";
import { useGetMemberships, type getMemberships } from "../../api/memberships/memberships";
import { useGetAllUsers, type getAllUsers } from "../../api/users/users";
import { ManageAdminsDialog } from "./ManageAdminsDialog";

// Only the two reads the dialog makes; the actions layer runs for real and
// stays inert, since nothing here is submitted.
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
}));

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
}));

const COMMUNITY = buildCommunity({ id: "c1", name: "Comunidad Solar" });

describe("ManageAdminsDialog", () => {
  beforeEach(() => {
    vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>({ items: [] }));
  });

  it("UI-MBR-007 lists an administrator without email by name alone", () => {
    vi.mocked(useGetMemberships).mockReturnValue(
      query.success<typeof getMemberships>([
        buildMembership({
          id: "m1",
          communityId: "c1",
          role: CommunityRole.COMMUNITY_ADMIN,
          user: buildUser({ id: "u1", fullName: "Ana García", email: null }),
        }),
        buildMembership({
          id: "m2",
          communityId: "c1",
          role: CommunityRole.COMMUNITY_ADMIN,
          user: buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" }),
        }),
      ]),
    );

    renderWithProviders(<ManageAdminsDialog community={COMMUNITY} open onClose={() => {}} />);

    const items = within(screen.getByRole("dialog")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/^Ana García$/);
    expect(items[1]).toHaveTextContent(/^Bruno Lealbruno@example\.com$/);
  });
});
