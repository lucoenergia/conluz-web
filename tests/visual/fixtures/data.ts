import type {
  GetDatadisConfigResponse,
  GetShellyConfigResponse,
  MembershipEnergyMetricsResponse,
  MembershipHourlyProfileResponse,
  MembershipMonthlyConsumptionBucketResponse,
  MembershipPaybackResponse,
  MembershipResponse,
  PartitionCoefficientResponse,
  PlantResponse,
  SharingAgreementResponse,
  SupplyResponse,
} from "../../../src/api/models";

// ---------------------------------------------------------------------------
// Fixed fixtures — these values NEVER change between runs
// ---------------------------------------------------------------------------

export const FIXED_TOKEN = "test-jwt-token-for-visual-regression";

/**
 * The browser clock for pages that render "today" (the chart date filter on the
 * plant and supply detail pages). Noon UTC, so the calendar day is the same in
 * any timezone a test host is likely to run in. Later than every fixture date.
 */
export const FIXED_NOW = new Date("2026-09-15T12:00:00Z");

export const FIXED_SUPPLY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Stable community UUID used in all member/community-admin fixtures. */
export const FIXED_COMMUNITY_ID = "cccccccc-dddd-eeee-ffff-000000000001";

// ---------------------------------------------------------------------------
// Capabilities
//
// Every response the backend returns now carries what the caller may do with
// it, and the app reads only that -- never a role or the platform-admin flag.
// These fixtures therefore decide what each baseline can see, so they mirror
// the backend's answers per role instead of granting everything: a fixture that
// said "true" everywhere would make every gating baseline pass without proving
// anything.
//
// Two rules from the backend worth keeping in view here:
//   - a platform admin gets no community operational data by virtue of the
//     flag, so FIXED_PLATFORM_ADMIN_USER has full platform capabilities and no
//     membership at all;
//   - canUpdate/canEnable/canDisable on a community are platform-wide
//     decisions, so a community admin does not get them.
// ---------------------------------------------------------------------------

const NO_PLATFORM_CAPABILITIES = {
  canCreateCommunity: false,
  canListUsers: false,
  canAdministerPlatform: false,
  canCreateUsers: false,
};

const FULL_PLATFORM_CAPABILITIES = {
  canCreateCommunity: true,
  canListUsers: true,
  canAdministerPlatform: true,
  canCreateUsers: true,
};

/**
 * What somebody else's user record offers a caller who administers neither the
 * platform nor any community of theirs: nothing. FIXED_USER_2 belongs to no
 * community, so this is every caller but a platform admin.
 */
export const UNMANAGEABLE_USER_CAPABILITIES = {
  canRead: true,
  canEdit: false,
  canDelete: false,
  canEnable: false,
  canDisable: false,
  canGrantPlatformAdmin: false,
  canRevokePlatformAdmin: false,
  canListSupplies: false,
};

/** What an ordinary caller may do with their own user record. */
const OWN_USER_CAPABILITIES = {
  canRead: true,
  canEdit: false,
  canDelete: false,
  canEnable: false,
  canDisable: false,
  canGrantPlatformAdmin: false,
  canRevokePlatformAdmin: false,
  canListSupplies: true,
};

/**
 * What a platform admin may do with somebody else's user record.
 *
 * Exported because the route mocks have to serve it conditionally:
 * UserAccessPolicy.canEdit allows a platform admin, or a community admin of one
 * of the target's communities, and nobody else -- so another user's record
 * cannot carry one fixed answer for every caller.
 */
export const MANAGED_USER_CAPABILITIES = {
  canRead: true,
  canEdit: true,
  canDelete: true,
  canEnable: true,
  canDisable: true,
  canGrantPlatformAdmin: true,
  canRevokePlatformAdmin: false,
  canListSupplies: false,
};

/** Membership, without administration. */
export const MEMBER_COMMUNITY_CAPABILITIES = {
  canRead: true,
  canUpdate: false,
  canEnable: false,
  canDisable: false,
  canManage: false,
  canManageMemberships: false,
  canManageMembershipInvestment: false,
  canListPlants: true,
  canCreatePlants: false,
  canCreateUsers: false,
  canReadProduction: true,
  canListSupplies: true,
};

/** Administration of one community, which is not platform administration. */
export const COMMUNITY_ADMIN_CAPABILITIES = {
  ...MEMBER_COMMUNITY_CAPABILITIES,
  canManage: true,
  canManageMemberships: true,
  canManageMembershipInvestment: true,
  canCreatePlants: true,
  canCreateUsers: true,
};

/**
 * A supply as its owner sees it: readable, and its coefficients with it --
 * they describe the owner's own share -- but not editable. canEdit is the
 * narrower flag by its own documentation, and this is the pairing that shows
 * it: the member keeps the coefficient panel and loses the actions menu.
 */
export const OWNER_SUPPLY_CAPABILITIES = {
  canRead: true,
  canEdit: false,
  canReadPartitionCoefficients: true,
  canCreatePlant: false,
};

/** The same supply as an admin of its community sees it. */
export const COMMUNITY_ADMIN_SUPPLY_CAPABILITIES = {
  ...OWNER_SUPPLY_CAPABILITIES,
  canEdit: true,
  canCreatePlant: true,
};

/**
 * A plant as a plain member of its community sees it: listing plants is open to
 * any member, and nothing else is. canListSharingAgreements is admin-only by
 * its own documentation, and canReadSupply says whether following the supply
 * reference would succeed -- for a member it would not.
 */
export const MEMBER_PLANT_CAPABILITIES = {
  canRead: true,
  canManage: false,
  canListSharingAgreements: false,
  canManageSharingAgreements: false,
  canReadSupply: false,
};

/** The same plant as an admin of its community sees it. */
export const COMMUNITY_ADMIN_PLANT_CAPABILITIES = {
  ...MEMBER_PLANT_CAPABILITIES,
  canManage: true,
  canListSharingAgreements: true,
  canManageSharingAgreements: true,
  canReadSupply: true,
};

/**
 * Reaching an agreement at all needs the plant's canListSharingAgreements,
 * which is admin-only, so there is no member shape here to split off: a member
 * never gets as far as one.
 */
const SHARING_AGREEMENT_CAPABILITIES = { canRead: true, canManage: true };

/**
 * A community as a platform admin who is not one of its members sees it: the
 * platform-wide decisions, and none of the membership ones. This is what makes
 * the platform dashboard baseline honest -- listing communities is a platform
 * right, reading their production is not.
 *
 * canManageMemberships is one of the platform-wide ones, despite sitting beside
 * the membership flags. MembershipAccessPolicy.canManageMemberships allows any
 * platform admin who can see the community, and CallerMemberships.canSeeCommunity
 * is true for a platform admin on every community -- so a fixture that inherited
 * `false` from the member shape was stating the opposite of the rule, and would
 * have hidden "Gestionar administradores" from the communities row menu in every
 * capture. Its stricter sibling canManageMembershipInvestment has no platform
 * bypass and stays false.
 */
export const PLATFORM_VIEW_COMMUNITY_CAPABILITIES = {
  ...MEMBER_COMMUNITY_CAPABILITIES,
  canUpdate: true,
  canEnable: true,
  canDisable: true,
  canManageMemberships: true,
  canListPlants: false,
  canReadProduction: false,
  canListSupplies: false,
};

/**
 * Member fixture — belongs to FIXED_COMMUNITY_ID as COMMUNITY_MEMBER.
 * Use for: the member home view, supply-points, supply-detail, supply modal tests.
 */
export const FIXED_MEMBER_USER = {
  id: "11111111-2222-3333-4444-555555555555",
  personalId: "12345678A",
  number: 1,
  fullName: "María García López",
  address: "Calle Mayor, 1",
  email: "admin@conluz.test",
  phoneNumber: "600000001",
  enabled: true,
  mustChangePassword: false,
  role: "ADMIN",
  isPlatformAdmin: false,
  memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_MEMBER" },
  capabilities: OWN_USER_CAPABILITIES,
  platformCapabilities: NO_PLATFORM_CAPABILITIES,
};

/**
 * Community-admin fixture — belongs to FIXED_COMMUNITY_ID as COMMUNITY_ADMIN.
 * Use for: sharing-agreements list tests (populated/empty/filtered) — see file header.
 */
export const FIXED_COMMUNITY_ADMIN_USER = {
  id: "55555555-6666-7777-8888-999999999999",
  personalId: "87654321B",
  number: 2,
  fullName: "Pedro Sánchez Ruiz",
  address: "Avenida del Parque, 42",
  email: "pedro@conluz.test",
  phoneNumber: "600000002",
  enabled: true,
  mustChangePassword: false,
  role: "ADMIN",
  isPlatformAdmin: false,
  memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_ADMIN" },
  capabilities: OWN_USER_CAPABILITIES,
  platformCapabilities: NO_PLATFORM_CAPABILITIES,
};

/**
 * Platform-admin fixture — no community memberships, isPlatformAdmin=true.
 * Use for: /platform (platform welcome), /users (users page).
 */
export const FIXED_PLATFORM_ADMIN_USER = {
  id: "33333333-4444-5555-6666-777777777777",
  personalId: "11111111C",
  number: 3,
  fullName: "María García López",
  address: "Calle Mayor, 1",
  email: "platform@conluz.test",
  phoneNumber: "600000003",
  enabled: true,
  mustChangePassword: false,
  role: "ADMIN",
  isPlatformAdmin: true,
  memberships: {},
  capabilities: OWN_USER_CAPABILITIES,
  platformCapabilities: FULL_PLATFORM_CAPABILITIES,
};

/**
 * No-community fixture — not a platform admin and no memberships.
 * resolveLandingRoute sends this user to /no-community.
 * Use for: /no-community screen.
 */
export const FIXED_NO_COMMUNITY_USER = {
  id: "44444444-5555-6666-7777-888888888888",
  personalId: "22222222D",
  number: 4,
  fullName: "Ana Martínez García",
  address: "Calle Secundaria, 2",
  email: "nocommunity@conluz.test",
  phoneNumber: "600000004",
  enabled: true,
  mustChangePassword: false,
  role: "PARTNER",
  isPlatformAdmin: false,
  memberships: {},
  capabilities: OWN_USER_CAPABILITIES,
  platformCapabilities: NO_PLATFORM_CAPABILITIES,
};

/** Secondary user shown in list responses — not the logged-in user. */
export const FIXED_USER_2 = {
  id: "22222222-3333-4444-5555-666666666666",
  personalId: "87654321B",
  number: 2,
  fullName: "Pedro Sánchez Ruiz",
  address: "Avenida del Parque, 42",
  email: "pedro@conluz.test",
  phoneNumber: "600000002",
  enabled: true,
  role: "PARTNER",
  isPlatformAdmin: false,
  memberships: {},
  capabilities: MANAGED_USER_CAPABILITIES,
};

/**
 * Named separately because `SupplyResponse.name` is nullable, so specs that
 * select on it cannot pass the field straight to a locator. The constant keeps
 * one source of truth without casting the null away.
 */
export const FIXED_SUPPLY_NAME = "Casa Principal";

export const FIXED_SUPPLY: SupplyResponse = {
  id: FIXED_SUPPLY_ID,
  code: "ES0021000000000000AA",
  name: FIXED_SUPPLY_NAME,
  address: "Calle Mayor, 1, 28001 Madrid",
  addressRef: "ESC D PTA 1",
  enabled: true,
  contract: { validDateFrom: "2024-01-01" },
  distributor: { name: "Iberdrola", code: "2", pointType: 5 },
  shelly: null,
  user: FIXED_MEMBER_USER,
  // The active-community guard compares this with the selected community; a
  // supply without one is never foreign, so omitting it would quietly disable
  // the guard in every baseline.
  community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
  capabilities: OWNER_SUPPLY_CAPABILITIES,
};

export const FIXED_SUPPLY_2: SupplyResponse = {
  id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
  code: "ES0021000000000000BB",
  name: "Garaje",
  address: "Calle Mayor, 1, Sótano, 28001 Madrid",
  addressRef: "",
  enabled: false,
  contract: { validDateFrom: "2024-03-15" },
  distributor: { name: "Endesa", code: "1", pointType: 3 },
  shelly: null,
  user: FIXED_MEMBER_USER,
  // The active-community guard compares this with the selected community; a
  // supply without one is never foreign, so omitting it would quietly disable
  // the guard in every baseline.
  community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
  capabilities: OWNER_SUPPLY_CAPABILITIES,
};

/**
 * A supply the community admin owns in FIXED_COMMUNITY_ID: the caller who has
 * both home views (#197). Served only by mockCommunityAdminOwnsSupply, so the
 * admin persona owns nothing everywhere else.
 */
export const FIXED_ADMIN_OWNED_SUPPLY: SupplyResponse = {
  id: "cccccccc-dddd-eeee-ffff-000000000000",
  code: "ES0021000000000000CC",
  name: "Casa de Pedro",
  address: "Avenida del Parque, 42, 28002 Madrid",
  addressRef: "",
  enabled: true,
  contract: { validDateFrom: "2024-02-01" },
  distributor: { name: "Iberdrola", code: "2", pointType: 5 },
  shelly: null,
  user: FIXED_COMMUNITY_ADMIN_USER,
  community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
  capabilities: OWNER_SUPPLY_CAPABILITIES,
};

/** A community the caller is NOT working in, for the cross-community assertions. */
export const OTHER_COMMUNITY_ID = "cccccccc-dddd-eeee-ffff-000000000002";

/**
 * A supply in another of the caller's communities.
 *
 * Only reachable through a user-scoped listing, which is the one endpoint that
 * can legitimately answer with more than one community: GET
 * /users/{userId}/supplies returns what the caller may read, and somebody
 * administering two communities may read both. The community-scoped listing
 * carries its communityId in the path and cannot return this row at all, so
 * putting it there would test a response the backend cannot produce.
 */
export const FIXED_SUPPLY_OTHER_COMMUNITY: SupplyResponse = {
  ...FIXED_SUPPLY,
  id: "eeeeeeee-ffff-0000-1111-222222222222",
  code: "ES0021000000000000ZZ",
  name: "Casa en otra comunidad",
  community: { id: OTHER_COMMUNITY_ID, name: "Vecinos del Sur" },
};

export const PAGED_SUPPLIES = {
  items: [FIXED_SUPPLY, FIXED_SUPPLY_2],
  size: 10000,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

export const PAGED_USERS = {
  // Include a platform admin so the Users page baseline exercises both the
  // platform-admin indicator (FIXED_PLATFORM_ADMIN_USER) and a plain row (FIXED_USER_2).
  items: [FIXED_PLATFORM_ADMIN_USER, FIXED_USER_2],
  size: 10,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

/**
 * Rich community fixtures for the platform dashboard baseline. Deterministic
 * values chosen to cover every derived signal:
 *   - Activa (enabled, members, admins): Luco de Jiloca, Barrio del Sol
 *   - Sin admin (no adminNames):          Vega Baja
 *   - Sin usuarios (memberCount 0):        Monte Alto
 *   - Deshabilitada (enabled false):       Río Verde
 */
export const DASHBOARD_COMMUNITIES = [
  { id: "c1", name: "Luco de Jiloca", code: "LDJ", enabled: true, adminNames: ["Ana Gil"], memberCount: 38, supplyPointCount: 42, capabilities: PLATFORM_VIEW_COMMUNITY_CAPABILITIES },
  { id: "c2", name: "Barrio del Sol", code: "BDS", enabled: true, adminNames: ["Luis Mora"], memberCount: 21, supplyPointCount: 24, capabilities: PLATFORM_VIEW_COMMUNITY_CAPABILITIES },
  { id: "c3", name: "Vega Baja", code: "VGB", enabled: true, adminNames: [], memberCount: 12, supplyPointCount: 8, capabilities: PLATFORM_VIEW_COMMUNITY_CAPABILITIES },
  { id: "c4", name: "Monte Alto", code: "MTA", enabled: true, adminNames: ["Sara Ruiz"], memberCount: 0, supplyPointCount: 3, capabilities: PLATFORM_VIEW_COMMUNITY_CAPABILITIES },
  { id: "c5", name: "Río Verde", code: "RVD", enabled: false, adminNames: ["Paco Díaz"], memberCount: 5, supplyPointCount: 2, capabilities: PLATFORM_VIEW_COMMUNITY_CAPABILITIES },
];

export const EMPTY_PRODUCTION: unknown[] = [];

/** Stable plant UUID used by the sharing-agreements baselines. */
export const FIXED_PLANT_ID = "dddddddd-eeee-ffff-0000-111111111111";
// A second plant the same supply also participates in. Only the coefficient
// history needs it, so it has no PlantResponse fixture of its own.
export const SECOND_PLANT_ID = "dddddddd-eeee-ffff-0000-222222222222";

export const FIXED_PLANT: PlantResponse = {
  id: FIXED_PLANT_ID,
  providerCode: "HWI-001",
  regulatoryCode: "ES1234567890123456AB1F",
  name: "Planta Solar Norte",
  address: "Polígono Industrial Norte, Nave 3",
  description: "Instalación fotovoltaica comunitaria",
  inverterProvider: "HUAWEI",
  totalPower: 120.5,
  connectionDate: "2023-05-10",
  // Required and non-nullable on PlantResponse: a plant always produces onto a
  // supply, so a fixture without one described a response the backend cannot
  // return. It is a reference, not the supply itself -- PlantDetailHeader shows
  // the CUPS either way and links it only on canReadSupply.
  supply: {
    id: FIXED_SUPPLY_ID,
    code: "ES0031300806333002ET0F",
    name: "Casa de Luco",
  },
  // The guard in usePlantInActiveCommunity compares this with the selected
  // community; without it the guard is silently inert in every plant baseline.
  community: { id: FIXED_COMMUNITY_ID },
  // Overwritten per caller by asPlantCaller in routes.ts. The admin shape is
  // the default so a route that forgets to re-stamp it keeps today's baseline
  // rather than quietly emptying a screen.
  capabilities: COMMUNITY_ADMIN_PLANT_CAPABILITIES,
};

export const PAGED_PLANTS = {
  items: [FIXED_PLANT],
  size: 10000,
  totalElements: 1,
  totalPages: 1,
  number: 0,
};

/**
 * Three agreements, one per status, so the populated baseline exercises every chip/badge colour.
 *
 * `file`: the DRAFT agreement carries a populated file on purpose — a draft
 * whose coefficients started from an imported TXT is the common case (every
 * agreement whose reparto came from outside Conluz), not an edge case, so the
 * canonical draft baselines below show file-panel state B (with its
 * subordinate Generar/Importar actions), not state A. State A (no file yet)
 * gets its own dedicated fixture and baseline (NO_FILE_DRAFT_AGREEMENT).
 */
export const FIXED_SHARING_AGREEMENTS = [
  {
    id: "eeeeeeee-ffff-0000-1111-222222222222",
    plantId: FIXED_PLANT_ID,
    name: "Reparto vecinos bloque A",
    notes: "Coeficientes acordados en la asamblea anual de la comunidad.",
    status: "PUBLISHED",
    installedPowerKw: 120.5,
    createdAt: "2024-06-15T10:00:00Z",
    createdBy: FIXED_COMMUNITY_ADMIN_USER.id,
    file: { id: "file-published", filename: "ES1234567890123456AB1F_2024.txt", uploadedAt: "2024-06-20T09:15:00Z" },
    capabilities: SHARING_AGREEMENT_CAPABILITIES,
  },
  {
    id: "ffffffff-0000-1111-2222-333333333333",
    plantId: FIXED_PLANT_ID,
    name: "Reparto ampliación bloque B",
    notes: "Pendiente de revisión antes de publicarse.",
    status: "DRAFT",
    installedPowerKw: 45,
    createdAt: "2024-09-01T09:30:00Z",
    createdBy: FIXED_COMMUNITY_ADMIN_USER.id,
    file: { id: "file-draft", filename: "ES1234567890123456AB1F_2025.txt", uploadedAt: "2025-01-10T08:00:00Z" },
    capabilities: SHARING_AGREEMENT_CAPABILITIES,
  },
  {
    id: "00000000-1111-2222-3333-444444444444",
    plantId: FIXED_PLANT_ID,
    name: "Reparto original 2022",
    notes: "Sustituido por el acuerdo vigente tras la ampliación de potencia.",
    status: "SUPERSEDED",
    installedPowerKw: 80,
    createdAt: "2022-02-01T08:00:00Z",
    createdBy: null,
    file: null,
    capabilities: SHARING_AGREEMENT_CAPABILITIES,
  },
];

/** State A (no file, DRAFT) needs its own fixture, since the canonical DRAFT_AGREEMENT above now has a file. */
export const NO_FILE_DRAFT_AGREEMENT = { ...FIXED_SHARING_AGREEMENTS[1], file: null };

/**
 * A second agreement with coefficients in force, beside the published one in
 * the list. Two PUBLISHED agreements in force at once is the legitimate state
 * during a distributor activation transition. It has its own installed power
 * (60 kW, against 120,5 kW and the draft's 45 kW), so a power line computed
 * with the wrong agreement shows. Not part of FIXED_SHARING_AGREEMENTS, so the
 * list baselines are unaffected; its by-id GET is served by
 * mockInForceComparisonRoutes.
 */
export const SECOND_IN_FORCE_AGREEMENT = {
  id: "11111111-2222-3333-4444-555555555555",
  plantId: FIXED_PLANT_ID,
  name: "Reparto bloque C",
  notes: null,
  status: "PUBLISHED",
  installedPowerKw: 60,
  createdAt: "2025-03-01T09:00:00Z",
  createdBy: FIXED_COMMUNITY_ADMIN_USER.id,
  file: null,
};

/**
 * References to the agreements that author in-force coefficients. Both are
 * PUBLISHED: a SUPERSEDED agreement never holds an open coefficient.
 */
const IN_FORCE_AGREEMENT_REF = { id: FIXED_SHARING_AGREEMENTS[0].id, name: FIXED_SHARING_AGREEMENTS[0].name, status: "PUBLISHED" };
const SECOND_IN_FORCE_AGREEMENT_REF = { id: SECOND_IN_FORCE_AGREEMENT.id, name: SECOND_IN_FORCE_AGREEMENT.name, status: "PUBLISHED" };

/**
 * Coefficient set covering every case the detail-page baselines must exercise:
 *   - PENDING with no validFrom (row 2) and APPLIED with validFrom (rows 1,3,4,5,6)
 *   - all 5 endState values: OPEN (1,2), OPEN_ORPHAN (3), PENDING_SUCCESSION (4), DERIVED (5), CLOSED (6)
 *   - a coefficient: 0 row (row 6) — meaningful (a supply that left distribution), never hidden
 *   - fileSum = 1.00 (100%); appliedSum = 0.75 (75%, below 100% — exercises the informational card)
 *
 * Also doubles as the DRAFT defensive-fallback fixture: paired with
 * DRAFT_AGREEMENT it represents a state the backend guarantees can't occur
 * (APPLIED requires publishing first; revert-to-draft is refused once
 * anything is applied), used only to prove the frontend doesn't silently
 * drop unexpected data if that guarantee is ever violated. Don't "clean up"
 * this fixture into an all-PENDING set — see FIXED_COEFFICIENTS_ALL_PENDING
 * below for what a real DRAFT looks like.
 */
export const FIXED_COEFFICIENTS_MIXED = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.3,
    applicationState: "APPLIED",
    validFrom: "2024-01-01T00:00:00Z",
    endState: "OPEN",
    currentCoefficient: { coefficient: 0.25, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: IN_FORCE_AGREEMENT_REF },
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.25,
    applicationState: "PENDING",
    endState: "OPEN",
    currentCoefficient: null,
  },
  {
    coefficientId: "coef-3",
    supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" },
    coefficient: 0.2,
    applicationState: "APPLIED",
    validFrom: "2024-02-01T00:00:00Z",
    endState: "OPEN_ORPHAN",
    currentCoefficient: { coefficient: 0.2, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: IN_FORCE_AGREEMENT_REF },
  },
  {
    coefficientId: "coef-4",
    supply: { id: "supply-4", name: "Nave D", code: "ES0031300000000004DD" },
    coefficient: 0.15,
    applicationState: "APPLIED",
    validFrom: "2023-01-01T00:00:00Z",
    endState: "PENDING_SUCCESSION",
    currentCoefficient: { coefficient: 0.15, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: IN_FORCE_AGREEMENT_REF },
  },
  {
    coefficientId: "coef-5",
    supply: { id: "supply-5", name: "Trastero E", code: "ES0031300000000005EE" },
    coefficient: 0.1,
    applicationState: "APPLIED",
    validFrom: "2022-01-01T00:00:00Z",
    endState: "DERIVED",
    endDate: "2023-12-31T00:00:00Z",
    currentCoefficient: { coefficient: 0.1, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: IN_FORCE_AGREEMENT_REF },
  },
  {
    coefficientId: "coef-6",
    supply: { id: "supply-6", name: "Ático F", code: "ES0031300000000006FF" },
    coefficient: 0,
    applicationState: "APPLIED",
    validFrom: "2024-03-01T00:00:00Z",
    endState: "CLOSED",
    endDate: "2024-05-01T00:00:00Z",
    currentCoefficient: { coefficient: 0, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: IN_FORCE_AGREEMENT_REF },
  },
];

/**
 * What a real DRAFT looks like: the backend guarantees every coefficient is
 * PENDING/OPEN until the agreement is published, so this is the canonical
 * fixture for the DRAFT detail baseline — no state columns, no filter chips.
 */
export const FIXED_COEFFICIENTS_ALL_PENDING = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.4,
    applicationState: "PENDING",
    endState: "OPEN",
    // Raised by this draft: 0.35 -> 0.40.
    currentCoefficient: { coefficient: 0.35, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: IN_FORCE_AGREEMENT_REF },
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.35,
    applicationState: "PENDING",
    endState: "OPEN",
    // Lowered by this draft: 0.40 -> 0.35, so one baseline shows both signs.
    // In force from the second agreement, so the context line reads "en
    // vigor hoy" and this row's power uses that agreement's 60 kW.
    currentCoefficient: { coefficient: 0.4, validFrom: "2025-04-01T00:00:00Z", sharingAgreement: SECOND_IN_FORCE_AGREEMENT_REF },
  },
  {
    coefficientId: "coef-3",
    supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" },
    coefficient: 0.25,
    applicationState: "PENDING",
    endState: "OPEN",
    // Genuinely on nothing yet: the "Nuevo" badge, in the same baseline.
    currentCoefficient: null,
  },
];

export const FIXED_COEFFICIENTS_EMPTY: unknown[] = [];

function activeCoefficient(id: string, supply: { id: string; name: string; code: string }, coefficient: number, sharingAgreement: object, validFrom: string) {
  return {
    id,
    supply,
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement,
    coefficient,
    validFrom,
    validTo: null,
    createdAt: "2024-06-15T10:00:00Z",
  };
}

/**
 * GET /plants/{plantId}/partition-coefficients/active for the full DRAFT
 * comparison, in CUPS order as the endpoint returns it: the in-force values of
 * Vivienda A and B (matching their rows' currentCoefficient), plus Nave D and
 * Trastero E, which are in force but not in FIXED_COEFFICIENTS_ALL_PENDING and
 * so leave the distribution, one from each in-force agreement.
 */
export const FIXED_ACTIVE_COEFFICIENTS = [
  activeCoefficient("active-1", { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" }, 0.35, IN_FORCE_AGREEMENT_REF, "2023-01-01"),
  activeCoefficient("active-2", { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" }, 0.4, SECOND_IN_FORCE_AGREEMENT_REF, "2025-04-01"),
  activeCoefficient("active-4", { id: "supply-4", name: "Nave D", code: "ES0031300000000004DD" }, 0.15, IN_FORCE_AGREEMENT_REF, "2023-01-01"),
  activeCoefficient("active-5", { id: "supply-5", name: "Trastero E", code: "ES0031300000000005EE" }, 0.1, SECOND_IN_FORCE_AGREEMENT_REF, "2025-04-01"),
];

/**
 * A DRAFT set that genuinely doesn't sum to 100% (0.4 + 0.35 = 0.75), for the
 * publish-not-offered baseline — distinct from FIXED_COEFFICIENTS_ALL_PENDING,
 * which sums to exactly 1.
 */
export const FIXED_COEFFICIENTS_INCOMPLETE = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.4,
    applicationState: "PENDING",
    endState: "OPEN",
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.35,
    applicationState: "PENDING",
    endState: "OPEN",
  },
];

/**
 * A supply genuinely participating in two plants, which is the whole point of
 * the multi-plant contract -- a single-plant fixture validates no grouping at
 * all. Carries a pending period (validFrom: null) too, so the client-side
 * filter that hides it from an admin is exercised rather than assumed.
 *
 * Deliberately NOT ordered newest-first here: the endpoint returns validFrom
 * ascending, and the component is what reverses it.
 */
// The supply the agreement coefficient fixtures use for "Vivienda A". Distinct
// from FIXED_SUPPLY_ID, which identifies the standalone supply-detail fixture.
export const HISTORY_SUPPLY_ID = "supply-1";

export const FIXED_SUPPLY_COEFFICIENT_HISTORY: PartitionCoefficientResponse[] = [
  {
    id: "hist-1",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: FIXED_SHARING_AGREEMENTS[2].id, name: "Reparto original 2022", status: "SUPERSEDED" },
    coefficient: 0.1,
    validFrom: "2022-03-01T00:00:00Z",
    validTo: "2023-01-01T00:00:00Z",
    createdAt: "2022-02-01T08:00:00Z",
    // Re-stamped per caller by asCoefficientCaller in routes.ts. Withheld by
    // default so a route that forgets to re-stamp hides links rather than
    // inventing an entitlement.
    capabilities: { canReadSharingAgreement: false },
  },
  {
    id: "hist-2",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: FIXED_SHARING_AGREEMENTS[0].id, name: "Reparto vecinos bloque A", status: "PUBLISHED" },
    coefficient: 0.25,
    validFrom: "2023-01-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-06-15T10:00:00Z",
    // Re-stamped per caller by asCoefficientCaller in routes.ts. Withheld by
    // default so a route that forgets to re-stamp hides links rather than
    // inventing an entitlement.
    capabilities: { canReadSharingAgreement: false },
  },
  {
    id: "hist-3",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: SECOND_PLANT_ID, name: "Planta Solar Sur" },
    sharingAgreement: { id: "sa-sur", name: "Reparto Sur 2024", status: "PUBLISHED" },
    coefficient: 0.4,
    validFrom: "2024-04-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-03-01T10:00:00Z",
    // Re-stamped per caller by asCoefficientCaller in routes.ts. Withheld by
    // default so a route that forgets to re-stamp hides links rather than
    // inventing an entitlement.
    capabilities: { canReadSharingAgreement: false },
  },
  {
    id: "hist-pending",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: FIXED_SHARING_AGREEMENTS[1].id, name: "Reparto ampliación bloque B", status: "DRAFT" },
    coefficient: 0.3,
    validFrom: null,
    validTo: null,
    createdAt: "2024-09-01T09:30:00Z",
    // Re-stamped per caller by asCoefficientCaller in routes.ts. Withheld by
    // default so a route that forgets to re-stamp hides links rather than
    // inventing an entitlement.
    capabilities: { canReadSharingAgreement: false },
  },
];

export const DRAFT_AGREEMENT = FIXED_SHARING_AGREEMENTS[1];
export const PUBLISHED_AGREEMENT = FIXED_SHARING_AGREEMENTS[0];
export const SUPERSEDED_AGREEMENT = FIXED_SHARING_AGREEMENTS[2];

/**
 * PUBLISHED_AGREEMENT is shared by ~20 baselines below (batch bar, dialogs,
 * editor states, ...) that have nothing to do with editing. Only the
 * dedicated "published" detail-page baseline should exercise the
 * last-edited tile, so it gets its own derived fixture instead of adding
 * updatedAt/updatedBy to the shared one, which would needlessly reshoot
 * every other PUBLISHED_AGREEMENT screenshot.
 */
export const PUBLISHED_AGREEMENT_EDITED = {
  ...PUBLISHED_AGREEMENT,
  updatedAt: "2026-08-01T09:00:00Z",
  updatedBy: FIXED_COMMUNITY_ADMIN_USER.id,
};

// ---------------------------------------------------------------------------
// Community management: members and integrations
// ---------------------------------------------------------------------------

/**
 * One community's roster: an admin, an active member and a disabled one, so the
 * role labels, the status chips and the counters all have something to show.
 *
 * Every row carries its own capabilities, as the backend returns them -- the
 * members screen reads those per row rather than asking once for the community,
 * so a single shape would make every row's menu identical and prove nothing.
 */
export const FIXED_MEMBERSHIPS: MembershipResponse[] = [
  {
    id: "membership-admin",
    communityId: FIXED_COMMUNITY_ID,
    user: {
      id: FIXED_COMMUNITY_ADMIN_USER.id,
      fullName: FIXED_COMMUNITY_ADMIN_USER.fullName,
      email: FIXED_COMMUNITY_ADMIN_USER.email,
      personalId: FIXED_COMMUNITY_ADMIN_USER.personalId,
      number: FIXED_COMMUNITY_ADMIN_USER.number,
      address: FIXED_COMMUNITY_ADMIN_USER.address,
      phoneNumber: FIXED_COMMUNITY_ADMIN_USER.phoneNumber,
      enabled: true,
      isPlatformAdmin: false,
      memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_ADMIN" },
      capabilities: OWN_USER_CAPABILITIES,
    },
    role: "COMMUNITY_ADMIN",
    enabled: true,
    // Their own membership: the backend does not offer them their own removal
    // or demotion, which is the safety rail the row menu has to respect.
    capabilities: {
      canUpdateRole: false,
      canDelete: false,
      canManageInvestment: true,
      canReadPayback: true,
    },
  },
  {
    id: "membership-member",
    communityId: FIXED_COMMUNITY_ID,
    user: {
      id: FIXED_MEMBER_USER.id,
      fullName: FIXED_MEMBER_USER.fullName,
      email: FIXED_MEMBER_USER.email,
      personalId: FIXED_MEMBER_USER.personalId,
      number: FIXED_MEMBER_USER.number,
      address: FIXED_MEMBER_USER.address,
      phoneNumber: FIXED_MEMBER_USER.phoneNumber,
      enabled: true,
      isPlatformAdmin: false,
      memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_MEMBER" },
      capabilities: MANAGED_USER_CAPABILITIES,
    },
    role: "COMMUNITY_MEMBER",
    enabled: true,
    capabilities: {
      canUpdateRole: true,
      canDelete: true,
      canManageInvestment: true,
      canReadPayback: true,
    },
  },
  {
    id: "membership-disabled",
    communityId: FIXED_COMMUNITY_ID,
    user: {
      id: FIXED_USER_2.id,
      fullName: FIXED_USER_2.fullName,
      email: FIXED_USER_2.email,
      personalId: FIXED_USER_2.personalId,
      number: FIXED_USER_2.number,
      address: FIXED_USER_2.address,
      phoneNumber: FIXED_USER_2.phoneNumber,
      enabled: false,
      isPlatformAdmin: false,
      memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_MEMBER" },
      capabilities: MANAGED_USER_CAPABILITIES,
    },
    role: "COMMUNITY_MEMBER",
    enabled: false,
    capabilities: {
      canUpdateRole: true,
      canDelete: true,
      canManageInvestment: false,
      canReadPayback: false,
    },
  },
];

/** Datadis configured and on, which is the state the integration card shows most. */
export const FIXED_DATADIS_CONFIG: GetDatadisConfigResponse = {
  username: "comunidad@conluz.test",
  passwordSet: true,
  baseUrl: "https://datadis.es",
  enabled: true,
};

/** Shelly off, so the two cards do not render the same state. */
export const FIXED_SHELLY_CONFIG: GetShellyConfigResponse = { enabled: false };

// ---------------------------------------------------------------------------
// Member home (#199): the caller's energy in the reference month and their
// payback. One fixture per state the view defines; the default is the normal
// state, priced with the estimate.
// ---------------------------------------------------------------------------

/** August 2026 in Europe/Madrid, as the backend bounds it: before FIXED_NOW, never the current month. */
const REFERENCE_AUGUST_2026 = { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T21:00:00Z" };

const ESTIMATED_PRICE = { eurPerKWh: 0.15 };

/** A complete month with 45 % of the assigned energy used: the middle message. */
export const MEMBER_ENERGY_METRICS: MembershipEnergyMetricsResponse = {
  period: REFERENCE_AUGUST_2026,
  coverage: { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 },
  energy: {
    assignedProductionKWh: 268,
    selfConsumptionKWh: 121,
    surplusKWh: 147,
    totalConsumptionKWh: 412,
    gridImportKWh: 291,
  },
  savings: { amountEur: 18.15, tariffSource: "ESTIMATE", estimatedPrice: ESTIMATED_PRICE },
  selfConsumptionRatio: 0.4515,
  selfSufficiencyRatio: 0.2937,
};

/** The same month priced with every supply's contracted tariff: no estimate label. */
export const MEMBER_ENERGY_METRICS_REAL_TARIFF: MembershipEnergyMetricsResponse = {
  ...MEMBER_ENERGY_METRICS,
  savings: { amountEur: 21.42, tariffSource: "REAL_TARIFF", estimatedPrice: null },
};

/** One of the two supplies sent nothing this month. */
export const MEMBER_ENERGY_METRICS_PARTIAL: MembershipEnergyMetricsResponse = {
  ...MEMBER_ENERGY_METRICS,
  coverage: { hoursWithData: 744, expectedHours: 1488, supplyCount: 2, suppliesWithData: 1 },
};

/**
 * No month resolves: the backend's answer for a community that has never
 * shared energy, and for a member with nothing assigned yet.
 */
export const MEMBER_ENERGY_METRICS_NO_MONTH: MembershipEnergyMetricsResponse = {
  period: { startDate: null, endDate: null },
  coverage: { hoursWithData: 0, expectedHours: 0, supplyCount: 1, suppliesWithData: 0 },
  energy: { assignedProductionKWh: 0, selfConsumptionKWh: 0, surplusKWh: 0, totalConsumptionKWh: 0, gridImportKWh: 0 },
  // ESTIMATE although nothing was priced: what the label must not key on.
  savings: { amountEur: null, tariffSource: "ESTIMATE", estimatedPrice: null },
  selfConsumptionRatio: null,
  selfSufficiencyRatio: null,
};

// The month before the reference month (#200), as the comparison requests
// it: July 2026, bounded by explicit dates, which the backend echoes back.
const PREVIOUS_JULY_2026 = { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-07-31T23:00:00+02:00" };

/**
 * A complete July below August on every compared figure: 11,70 € saved, 31 %
 * of the assigned energy used, 20 % of the consumption from the community.
 * The default, so the member home shows a comparison with a rise.
 */
export const MEMBER_ENERGY_METRICS_PREVIOUS: MembershipEnergyMetricsResponse = {
  period: PREVIOUS_JULY_2026,
  coverage: { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 },
  energy: {
    assignedProductionKWh: 251,
    selfConsumptionKWh: 78,
    surplusKWh: 173,
    totalConsumptionKWh: 382,
    gridImportKWh: 304,
  },
  savings: { amountEur: 11.7, tariffSource: "ESTIMATE", estimatedPrice: ESTIMATED_PRICE },
  selfConsumptionRatio: 0.3108,
  selfSufficiencyRatio: 0.2042,
};

/** A complete July above August on every compared figure: 24,00 € saved, 55 % used, 37 % from the community. */
export const MEMBER_ENERGY_METRICS_PREVIOUS_HIGHER: MembershipEnergyMetricsResponse = {
  ...MEMBER_ENERGY_METRICS_PREVIOUS,
  energy: {
    assignedProductionKWh: 290,
    selfConsumptionKWh: 160,
    surplusKWh: 130,
    totalConsumptionKWh: 430,
    gridImportKWh: 270,
  },
  savings: { amountEur: 24, tariffSource: "ESTIMATE", estimatedPrice: ESTIMATED_PRICE },
  selfConsumptionRatio: 0.5517,
  selfSufficiencyRatio: 0.3721,
};

/** July with nothing recorded: not yet published, or before the member's supplies existed. */
export const MEMBER_ENERGY_METRICS_PREVIOUS_NO_DATA: MembershipEnergyMetricsResponse = {
  period: PREVIOUS_JULY_2026,
  coverage: { hoursWithData: 0, expectedHours: 1488, supplyCount: 2, suppliesWithData: 0 },
  energy: { assignedProductionKWh: 0, selfConsumptionKWh: 0, surplusKWh: 0, totalConsumptionKWh: 0, gridImportKWh: 0 },
  // An explicit period always yields an amount, 0.00 when nothing was priced.
  savings: { amountEur: 0, tariffSource: "ESTIMATE", estimatedPrice: null },
  selfConsumptionRatio: null,
  selfSufficiencyRatio: null,
};

/** July with one of the two supplies silent: enough to compare, but the comparison is affected. */
export const MEMBER_ENERGY_METRICS_PREVIOUS_PARTIAL: MembershipEnergyMetricsResponse = {
  ...MEMBER_ENERGY_METRICS_PREVIOUS,
  coverage: { hoursWithData: 744, expectedHours: 1488, supplyCount: 2, suppliesWithData: 1 },
  energy: {
    assignedProductionKWh: 130,
    selfConsumptionKWh: 60,
    surplusKWh: 70,
    totalConsumptionKWh: 200,
    gridImportKWh: 140,
  },
  savings: { amountEur: 9, tariffSource: "ESTIMATE", estimatedPrice: ESTIMATED_PRICE },
  selfConsumptionRatio: 0.4615,
  selfSufficiencyRatio: 0.3,
};

/** A stored month of the member's two supplies (#201), both reporting unless stated. */
function storedMonth(
  date: string,
  selfConsumptionEnergyKWh: number,
  consumptionKWh: number,
  savingsEur: number,
  suppliesWithData = 2,
): MembershipMonthlyConsumptionBucketResponse {
  return {
    date,
    time: "00:00",
    consumptionKWh,
    surplusEnergyKWh: 0,
    generationEnergyKWh: selfConsumptionEnergyKWh,
    selfConsumptionEnergyKWh,
    savingsEur,
    tariffSource: "ESTIMATE",
    supplyCount: 2,
    suppliesWithData,
  };
}

/** A month in which neither supply stored a record: zero energy, null savings, as the backend answers it. */
function nothingStoredMonth(date: string): MembershipMonthlyConsumptionBucketResponse {
  return {
    date,
    time: "00:00",
    consumptionKWh: 0,
    surplusEnergyKWh: 0,
    generationEnergyKWh: 0,
    selfConsumptionEnergyKWh: 0,
    savingsEur: null,
    tariffSource: null,
    supplyCount: 2,
    suppliesWithData: 0,
  };
}

/** September 2025 to August 2026: the twelve months ending at the reference month. */
const SERIES_MONTHS = [
  "2025/09/01", "2025/10/01", "2025/11/01", "2025/12/01", "2026/01/01", "2026/02/01",
  "2026/03/01", "2026/04/01", "2026/05/01", "2026/06/01", "2026/07/01", "2026/08/01",
];

/** Twelve stored, complete months, sunnier in summer; August matches the reference month. */
export const MEMBER_MONTHLY_SERIES: MembershipMonthlyConsumptionBucketResponse[] = [
  storedMonth("2025/09/01", 112, 268, 16.8),
  storedMonth("2025/10/01", 84, 301, 12.6),
  storedMonth("2025/11/01", 52, 342, 7.8),
  storedMonth("2025/12/01", 38, 371, 5.7),
  storedMonth("2026/01/01", 41, 365, 6.15),
  storedMonth("2026/02/01", 63, 322, 9.45),
  storedMonth("2026/03/01", 89, 290, 13.35),
  storedMonth("2026/04/01", 104, 262, 15.6),
  storedMonth("2026/05/01", 126, 238, 18.9),
  storedMonth("2026/06/01", 131, 251, 19.65),
  storedMonth("2026/07/01", 128, 284, 19.2),
  storedMonth("2026/08/01", 121, 291, 18.15),
];

/**
 * Every state in one series: November is a measured zero (both supplies
 * reported, all zero), December has nothing stored, and February is
 * incomplete -- one of the two supplies reported.
 */
export const MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE: MembershipMonthlyConsumptionBucketResponse[] = MEMBER_MONTHLY_SERIES.map(
  (month) => {
    if (month.date === "2025/11/01") return storedMonth(month.date, 0, 0, 0);
    if (month.date === "2025/12/01") return nothingStoredMonth(month.date);
    if (month.date === "2026/02/01") return storedMonth(month.date, 31, 158, 4.65, 1);
    return month;
  },
);

/** A new member: only the reference month has anything stored. */
export const MEMBER_MONTHLY_SERIES_ONE_MONTH: MembershipMonthlyConsumptionBucketResponse[] = SERIES_MONTHS.map((date) =>
  date === "2026/08/01" ? storedMonth(date, 121, 291, 18.15) : nothingStoredMonth(date),
);

/** No month in the range has anything stored. */
export const MEMBER_MONTHLY_SERIES_EMPTY: MembershipMonthlyConsumptionBucketResponse[] = SERIES_MONTHS.map(nothingStoredMonth);

/**
 * August's average day: consumption every hour, peaking in the evening;
 * assigned production from 7 h to 20 h, peaking at midday, and a measured zero
 * through the night -- the records are there, the sun is not. 62 samples per
 * series and hour: two supplies over 31 days.
 */
const HOURLY_CONSUMPTION = [
  0.21, 0.18, 0.16, 0.15, 0.15, 0.17, 0.24, 0.33, 0.31, 0.27, 0.25, 0.26,
  0.3, 0.32, 0.29, 0.26, 0.28, 0.35, 0.44, 0.52, 0.55, 0.49, 0.37, 0.27,
];
const HOURLY_ASSIGNED_PRODUCTION = [
  0, 0, 0, 0, 0, 0, 0, 0.04, 0.16, 0.31, 0.44, 0.53,
  0.58, 0.57, 0.52, 0.43, 0.31, 0.18, 0.08, 0.02, 0.005, 0, 0, 0,
];

export const MEMBER_HOURLY_PROFILE: MembershipHourlyProfileResponse = {
  period: REFERENCE_AUGUST_2026,
  coverage: { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 },
  buckets: HOURLY_CONSUMPTION.map((averageConsumptionKWh, hour) => ({
    hour,
    averageConsumptionKWh,
    consumptionSampleCount: 62,
    averageAssignedProductionKWh: HOURLY_ASSIGNED_PRODUCTION[hour],
    assignedProductionSampleCount: 62,
  })),
};

/**
 * Hours without samples: 3 h has none in either series, and 6 h, 7 h and 20 h
 * have consumption but no assigned production -- each series rests on its own
 * count.
 */
export const MEMBER_HOURLY_PROFILE_GAPS: MembershipHourlyProfileResponse = {
  ...MEMBER_HOURLY_PROFILE,
  buckets: MEMBER_HOURLY_PROFILE.buckets.map((bucket) => {
    if (bucket.hour === 3) {
      return { ...bucket, averageConsumptionKWh: null, consumptionSampleCount: 0, averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 };
    }
    if ([6, 7, 20].includes(bucket.hour)) {
      return { ...bucket, averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 };
    }
    return bucket;
  }),
};

/**
 * A month when the assigned energy never exceeds consumption -- every hour's
 * assigned production is a third of what was consumed -- so no hour is among
 * the best (#231).
 */
export const MEMBER_HOURLY_PROFILE_NO_BEST_HOUR: MembershipHourlyProfileResponse = {
  ...MEMBER_HOURLY_PROFILE,
  buckets: MEMBER_HOURLY_PROFILE.buckets.map((bucket) => ({
    ...bucket,
    averageAssignedProductionKWh: Math.round(((bucket.averageConsumptionKWh ?? 0) / 3) * 100) / 100,
  })),
};

/** No month resolves yet: null bounds, and the 24 hours without a sample. */
export const MEMBER_HOURLY_PROFILE_EMPTY: MembershipHourlyProfileResponse = {
  period: { startDate: null, endDate: null },
  coverage: { hoursWithData: 0, expectedHours: 0, supplyCount: 2, suppliesWithData: 0 },
  buckets: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    averageConsumptionKWh: null,
    consumptionSampleCount: 0,
    averageAssignedProductionKWh: null,
    assignedProductionSampleCount: 0,
  })),
};

/** 42 % of a 500 € investment recovered, priced with the estimate. */
export const MEMBER_PAYBACK: MembershipPaybackResponse = {
  investmentEur: 500,
  savedEur: 212.4,
  remainingEur: 287.6,
  progressRatio: 0.4248,
  startDate: "2025-03-01",
  estimatedRemainingMonths: 19,
  tariffSource: "ESTIMATE",
  estimatedPrice: ESTIMATED_PRICE,
};

export const MEMBER_PAYBACK_REAL_TARIFF: MembershipPaybackResponse = {
  ...MEMBER_PAYBACK,
  savedEur: 250.1,
  remainingEur: 249.9,
  progressRatio: 0.5002,
  estimatedRemainingMonths: 15,
  tariffSource: "REAL_TARIFF",
  estimatedPrice: null,
};

export const MEMBER_PAYBACK_NO_INVESTMENT: MembershipPaybackResponse = {
  ...MEMBER_PAYBACK,
  investmentEur: null,
  remainingEur: null,
  progressRatio: null,
  estimatedRemainingMonths: null,
};

/** 640 € saved on a 500 € investment. */
export const MEMBER_PAYBACK_RECOVERED: MembershipPaybackResponse = {
  ...MEMBER_PAYBACK,
  savedEur: 640,
  remainingEur: 0,
  progressRatio: 1.28,
  estimatedRemainingMonths: 0,
};

/** The community has never activated a partition coefficient. */
export const MEMBER_PAYBACK_NOTHING_SHARED: MembershipPaybackResponse = {
  investmentEur: 500,
  savedEur: null,
  remainingEur: null,
  progressRatio: null,
  startDate: null,
  estimatedRemainingMonths: null,
  tariffSource: "ESTIMATE",
  estimatedPrice: null,
};

/** The community shares energy, but nothing has been saved by this member yet. */
export const MEMBER_PAYBACK_NEW_MEMBER: MembershipPaybackResponse = {
  ...MEMBER_PAYBACK,
  savedEur: 0,
  remainingEur: 500,
  progressRatio: 0,
  estimatedRemainingMonths: null,
};

// ---------------------------------------------------------------------------
// The community admin's management home (#198)
// ---------------------------------------------------------------------------

/**
 * A second plant of the community, so the management home shows plants in
 * different stages side by side. Its own id: SECOND_PLANT_ID belongs to the
 * coefficient history, which must not start resolving a plant for it.
 */
export const MANAGEMENT_SECOND_PLANT: PlantResponse = {
  ...FIXED_PLANT,
  id: "dddddddd-eeee-ffff-0000-333333333333",
  providerCode: "HWI-002",
  regulatoryCode: "ES1234567890123456AB2F",
  name: "Cubierta del polideportivo",
  address: "Calle del Deporte 4",
  description: null,
  totalPower: 35,
};

/** The agreement in force of FIXED_PLANT, as the management home reads it. */
export const MANAGEMENT_PUBLISHED_AGREEMENT: SharingAgreementResponse = {
  id: "22222222-3333-4444-5555-666666666666",
  plantId: FIXED_PLANT_ID,
  name: "Reparto vecinos bloque A",
  notes: null,
  status: "PUBLISHED",
  installedPowerKw: 120.5,
  createdAt: "2024-06-15T10:00:00Z",
  createdBy: FIXED_COMMUNITY_ADMIN_USER.id,
  updatedAt: null,
  updatedBy: null,
  file: null,
  capabilities: SHARING_AGREEMENT_CAPABILITIES,
};

/** An agreement of FIXED_PLANT that a newer one superseded: it must not be named as in force. */
export const MANAGEMENT_SUPERSEDED_AGREEMENT: SharingAgreementResponse = {
  ...MANAGEMENT_PUBLISHED_AGREEMENT,
  id: "33333333-4444-5555-6666-777777777777",
  name: "Reparto original 2022",
  status: "SUPERSEDED",
  installedPowerKw: 80,
  createdAt: "2022-02-01T08:00:00Z",
  createdBy: null,
};

/** MANAGEMENT_SECOND_PLANT's first agreement, still a draft. */
export const MANAGEMENT_DRAFT_AGREEMENT: SharingAgreementResponse = {
  ...MANAGEMENT_PUBLISHED_AGREEMENT,
  id: "44444444-5555-6666-7777-888888888888",
  plantId: MANAGEMENT_SECOND_PLANT.id,
  name: "Reparto de la cubierta",
  status: "DRAFT",
  installedPowerKw: 35,
  createdAt: "2026-07-01T09:00:00Z",
};
