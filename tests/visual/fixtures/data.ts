// ---------------------------------------------------------------------------
// Fixed fixtures — these values NEVER change between runs
// ---------------------------------------------------------------------------

export const FIXED_TOKEN = "test-jwt-token-for-visual-regression";

export const FIXED_SUPPLY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Stable community UUID used in all member/community-admin fixtures. */
export const FIXED_COMMUNITY_ID = "cccccccc-dddd-eeee-ffff-000000000001";

/**
 * Member fixture — belongs to FIXED_COMMUNITY_ID as COMMUNITY_MEMBER.
 * Use for: home, supply-points, supply-detail, supply modal tests.
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
  role: "ADMIN",
  isPlatformAdmin: false,
  memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_MEMBER" },
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
  role: "ADMIN",
  isPlatformAdmin: false,
  memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_ADMIN" },
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
  role: "ADMIN",
  isPlatformAdmin: true,
  memberships: {},
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
  role: "PARTNER",
  isPlatformAdmin: false,
  memberships: {},
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
};

export const FIXED_SUPPLY = {
  id: FIXED_SUPPLY_ID,
  code: "ES0021000000000000AA",
  name: "Casa Principal",
  address: "Calle Mayor, 1, 28001 Madrid",
  addressRef: "ESC D PTA 1",
  partitionCoefficient: 0.1234,
  enabled: true,
  datadisValidDateFrom: "2024-01-01",
  datadisDistributor: "Iberdrola",
  datadisDistributorCode: "2",
  datadisPointType: 5,
  datadisIsThirdParty: false,
  user: FIXED_MEMBER_USER,
};

export const FIXED_SUPPLY_2 = {
  id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
  code: "ES0021000000000000BB",
  name: "Garaje",
  address: "Calle Mayor, 1, Sótano, 28001 Madrid",
  addressRef: "",
  partitionCoefficient: 0.0566,
  enabled: false,
  datadisValidDateFrom: "2024-03-15",
  datadisDistributor: "Endesa",
  datadisDistributorCode: "1",
  datadisPointType: 3,
  datadisIsThirdParty: false,
  user: FIXED_MEMBER_USER,
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
  { id: "c1", name: "Luco de Jiloca", code: "LDJ", enabled: true, adminNames: ["Ana Gil"], memberCount: 38, supplyPointCount: 42 },
  { id: "c2", name: "Barrio del Sol", code: "BDS", enabled: true, adminNames: ["Luis Mora"], memberCount: 21, supplyPointCount: 24 },
  { id: "c3", name: "Vega Baja", code: "VGB", enabled: true, adminNames: [], memberCount: 12, supplyPointCount: 8 },
  { id: "c4", name: "Monte Alto", code: "MTA", enabled: true, adminNames: ["Sara Ruiz"], memberCount: 0, supplyPointCount: 3 },
  { id: "c5", name: "Río Verde", code: "RVD", enabled: false, adminNames: ["Paco Díaz"], memberCount: 5, supplyPointCount: 2 },
];

export const EMPTY_PRODUCTION: unknown[] = [];

/** Stable plant UUID used by the sharing-agreements baselines. */
export const FIXED_PLANT_ID = "dddddddd-eeee-ffff-0000-111111111111";
// A second plant the same supply also participates in. Only the coefficient
// history needs it, so it has no PlantResponse fixture of its own.
export const SECOND_PLANT_ID = "dddddddd-eeee-ffff-0000-222222222222";

export const FIXED_PLANT = {
  id: FIXED_PLANT_ID,
  providerCode: "HWI-001",
  regulatoryCode: "ES1234567890123456AB1F",
  name: "Planta Solar Norte",
  address: "Polígono Industrial Norte, Nave 3",
  description: "Instalación fotovoltaica comunitaria",
  inverterProvider: "HUAWEI",
  totalPower: 120.5,
  connectionDate: "2023-05-10",
};

/**
 * The plant fixture plus a linked supply. Kept separate from FIXED_PLANT so the
 * sharing-agreement baselines, which share that fixture, stay byte-identical.
 * The detail header needs it: without a linked supply it would have four
 * details rather than five, and the "+5" toggle is part of what AC1 specifies.
 */
export const FIXED_PLANT_WITH_SUPPLY = {
  ...FIXED_PLANT,
  supply: {
    id: FIXED_SUPPLY_ID,
    code: "ES0031300806333002ET0F",
    name: "Casa de Luco",
  },
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
  },
];

/** State A (no file, DRAFT) needs its own fixture, since the canonical DRAFT_AGREEMENT above now has a file. */
export const NO_FILE_DRAFT_AGREEMENT = { ...FIXED_SHARING_AGREEMENTS[1], file: null };

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
    currentCoefficient: { coefficient: 0.25, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
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
    currentCoefficient: { coefficient: 0.2, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-4",
    supply: { id: "supply-4", name: "Nave D", code: "ES0031300000000004DD" },
    coefficient: 0.15,
    applicationState: "APPLIED",
    validFrom: "2023-01-01T00:00:00Z",
    endState: "PENDING_SUCCESSION",
    currentCoefficient: { coefficient: 0.15, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-5",
    supply: { id: "supply-5", name: "Trastero E", code: "ES0031300000000005EE" },
    coefficient: 0.1,
    applicationState: "APPLIED",
    validFrom: "2022-01-01T00:00:00Z",
    endState: "DERIVED",
    endDate: "2023-12-31T00:00:00Z",
    currentCoefficient: { coefficient: 0.1, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-6",
    supply: { id: "supply-6", name: "Ático F", code: "ES0031300000000006FF" },
    coefficient: 0,
    applicationState: "APPLIED",
    validFrom: "2024-03-01T00:00:00Z",
    endState: "CLOSED",
    endDate: "2024-05-01T00:00:00Z",
    currentCoefficient: { coefficient: 0, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
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
    currentCoefficient: { coefficient: 0.35, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.35,
    applicationState: "PENDING",
    endState: "OPEN",
    // Lowered by this draft: 0.40 -> 0.35, so one baseline shows both signs.
    currentCoefficient: { coefficient: 0.4, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-3",
    supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" },
    coefficient: 0.25,
    applicationState: "PENDING",
    endState: "OPEN",
    // Genuinely on nothing yet — the "—" branch of AC8, in the same baseline.
    currentCoefficient: null,
  },
];

export const FIXED_COEFFICIENTS_EMPTY: unknown[] = [];

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

export const FIXED_SUPPLY_COEFFICIENT_HISTORY = [
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
