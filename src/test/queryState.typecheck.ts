/**
 * Type-level test for the tier 1 mocking contract (ADR-0001, decision 2).
 * Checked by `tsc -b`; never executed: it has no `.spec` suffix, so Vitest
 * does not collect it, and nothing imports it.
 *
 * Every `@ts-expect-error` below must stay an error. If a change to the
 * builders, the generated client or TanStack Query lets one of these compile,
 * the directive becomes unused and `tsc -b` fails. The positive controls keep
 * the file from passing just because everything is an error.
 */
import { vi } from "vitest";
import { AxiosError } from "axios";
import { getAllUsers, useGetAllUsers } from "../api/users/users";
import { useCreateMembership } from "../api/memberships/memberships";
import { buildUser } from "./fixtures";
import { mutation, query } from "./queryState";

// ── Positive controls: each named state is a valid hook result ──────────────

vi.mock(import("../api/users/users"), () => ({ useGetAllUsers: vi.fn() }));

vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>({ items: [buildUser()] }));
vi.mocked(useGetAllUsers).mockReturnValue(query.loading());
vi.mocked(useGetAllUsers).mockReturnValue(query.disabled());
vi.mocked(useGetAllUsers).mockReturnValue(query.error(new AxiosError("boom")));
vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync: vi.fn() }));
vi.mocked(useCreateMembership).mockReturnValue(
  mutation.pending({ communityId: "c1", data: { userId: "u1", role: "COMMUNITY_MEMBER" } }),
);

// ── The impossible states and slips the harness exists to stop ──────────────

// @ts-expect-error -- AC2: a hand-written partial literal is not a hook result
vi.mocked(useGetAllUsers).mockReturnValue({ data: undefined, isLoading: false });

// @ts-expect-error -- AC2: a resolved query cannot carry undefined data
query.success<typeof getAllUsers>(undefined);

// @ts-expect-error -- success must name its fetcher; without it data is `never`
query.success({ items: [] });

// @ts-expect-error -- data must match the fetcher's response type (a page, not an array)
query.success<typeof getAllUsers>([buildUser()]);

// @ts-expect-error -- the factory is typed against the real module, so a misspelled export fails
vi.mock(import("../api/users/users"), () => ({ useGetAllUserz: vi.fn() }));

vi.mocked(useCreateMembership).mockReturnValue(
  // @ts-expect-error -- mutation variables are checked against the hook's signature
  mutation.pending({ communityId: "c1", data: { userId: "u1", role: "OWNER" } }),
);
