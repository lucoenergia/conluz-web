import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityRole, type SupplyResponse } from "../../api/models";
import { useGetSuppliesByUserId, type getSuppliesByUserId } from "../../api/users/users";
import { useLoggedUser } from "../../context/logged-user.context";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  COMMUNITY_A,
  COMMUNITY_B,
  USER_ID,
  answerCommunities,
  communitiesPending,
  currentUser,
  ownSupply,
} from "./homeViews.mocks";
import { useHomeViews } from "./useHomeViews";

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

type OwnSupplies = { supplies: SupplyResponse[] } | "pending" | { error: unknown };

/** GET /users/{me}/supplies, answered only while the hook is enabled. */
function answerOwnSupplies(answer: OwnSupplies): void {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    if (answer === "pending") return query.loading();
    if ("error" in answer) return query.error(answer.error);
    return query.success<typeof getSuppliesByUserId>(answer.supplies);
  });
}

function ownSuppliesWereRead(): boolean {
  return vi.mocked(useGetSuppliesByUserId).mock.calls.some(([, options]) => options?.query?.enabled !== false);
}

function homeViewsIn(communityId: string) {
  return renderHookWithProviders(() => useHomeViews(), { activeCommunityId: communityId }).result.current;
}

describe("useHomeViews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plain member", () => {
    beforeEach(() => {
      vi.mocked(useLoggedUser).mockReturnValue(currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_MEMBER }));
      answerCommunities({ adminOf: [] });
    });

    it("has the member view and not the management one", () => {
      answerOwnSupplies({ supplies: [ownSupply(COMMUNITY_A)] });

      const views = homeViewsIn(COMMUNITY_A);

      expect(views.member.state).toBe("allowed");
      expect(views.management.state).toBe("denied");
    });

    // A member's home exists whether or not they own anything yet; the view
    // explains there is nothing to show. Not an impossible state.
    it("keeps the member view when they own no supplies", () => {
      answerOwnSupplies({ supplies: [] });

      expect(homeViewsIn(COMMUNITY_A).member.state).toBe("allowed");
    });

    it("never reads their supplies, since the answer would change nothing", () => {
      answerOwnSupplies({ supplies: [] });

      homeViewsIn(COMMUNITY_A);

      expect(ownSuppliesWereRead()).toBe(false);
    });
  });

  describe("community admin", () => {
    beforeEach(() => {
      vi.mocked(useLoggedUser).mockReturnValue(currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_ADMIN }));
      answerCommunities({ adminOf: [COMMUNITY_A] });
    });

    it("who owns supplies here has both views", () => {
      answerOwnSupplies({ supplies: [ownSupply(COMMUNITY_A)] });

      const views = homeViewsIn(COMMUNITY_A);

      expect(views.management.state).toBe("allowed");
      expect(views.member.state).toBe("allowed");
    });

    it("reads their own supplies, by their own id", () => {
      answerOwnSupplies({ supplies: [] });

      homeViewsIn(COMMUNITY_A);

      expect(ownSuppliesWereRead()).toBe(true);
      expect(vi.mocked(useGetSuppliesByUserId)).toHaveBeenCalledWith(USER_ID, expect.anything());
    });

    it("known to own no supplies here has only the management view", () => {
      answerOwnSupplies({ supplies: [] });

      const views = homeViewsIn(COMMUNITY_A);

      expect(views.management.state).toBe("allowed");
      expect(views.member.state).toBe("denied");
    });

    // The listing spans every community the caller belongs to; a supply in
    // another one says nothing about this one.
    it("whose supplies are all in another community has only the management view", () => {
      answerOwnSupplies({ supplies: [ownSupply(COMMUNITY_B)] });

      expect(homeViewsIn(COMMUNITY_A).member.state).toBe("denied");
    });

    // Unknown is not "owns none": failing to find out offers the view rather
    // than hiding an admin's own data behind a transient error.
    it("whose supplies could not be read is offered the member view", () => {
      answerOwnSupplies({ error: new Error("Network Error") });

      expect(homeViewsIn(COMMUNITY_A).member.state).toBe("allowed");
    });

    it("keeps the management view whatever the ownership read does", () => {
      const answers: OwnSupplies[] = ["pending", { error: new Error("Network Error") }, { supplies: [] }];
      for (const answer of answers) {
        answerOwnSupplies(answer);
        expect(homeViewsIn(COMMUNITY_A).management.state).toBe("allowed");
      }
    });

    it("has no member-view answer while the ownership read is in flight", () => {
      answerOwnSupplies("pending");

      expect(homeViewsIn(COMMUNITY_A).member.state).toBe("pending");
    });
  });

  it("answers neither view while the community's capabilities are loading", () => {
    vi.mocked(useLoggedUser).mockReturnValue(currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_ADMIN }));
    communitiesPending();
    answerOwnSupplies({ supplies: [ownSupply(COMMUNITY_A)] });

    const views = homeViewsIn(COMMUNITY_A);

    expect(views.management.state).toBe("pending");
    expect(views.member.state).toBe("pending");
    expect(ownSuppliesWereRead()).toBe(false);
  });
});
