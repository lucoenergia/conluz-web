# Data shapes

Several components take records straight from the Conluz API (or small local item types). Their
`.d.ts` names the type; this file spells each one out, generated from the real types. Build the
objects inline with realistic Spanish content. Dates are ISO strings (`"2026-03-12"` or
`"2026-03-12T09:30:00Z"`); coefficients are on a 0-1 scale; power in kW, energy in kWh.

Rules worth knowing before you fake data:

- A `SUPERSEDED` sharing agreement holds no open coefficient rows: in-force coefficients belong to a
  `PUBLISHED` agreement.
- `capabilities` objects say what the viewer may do. Pass the flags you want the UI to show as `true`;
  a missing flag reads as "not allowed".
- `MenuItem.requires` is read by the app shell to filter entries; in a design use `{ scope: "always" }`.
- A supply's owner is shown from `ownerRecord` (the member record in the supply's community), never
  from `user`, which carries only the user id. Contract, distributor and Shelly sub-records are rarely
  rendered by these components; pass `null` where the type allows it.

```ts
interface SharingAgreementResponse {
  /** Internal unique identifier of the sharing agreement */
  id: string;
  /** Identifier of the plant this agreement distributes production from */
  plantId: string;
  /** Human-readable label for the agreement */
  name: string;
  /** Free-text notes about the agreement */
  notes: string | null;
  /** Status of the agreement: DRAFT, PUBLISHED or SUPERSEDED */
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  /** Snapshot of the plant's nominal power at authoring time, in kW. */
  nominalPowerKW: number;
  /** Date and time the agreement was created */
  createdAt: string;
  /** Identifier of the user who created the agreement. Null means it was created by the system (a migration), not by a person */
  createdBy: string | null;
  /** Date and time the agreement was last edited. Null means it has never been edited since creation */
  updatedAt: string | null;
  /** Identifier of the user who last edited the agreement. Null means it has never been edited since creation */
  updatedBy: string | null;
  /** Metadata of the latest evidence file uploaded for this agreement. Null means no file has been uploaded, never that it wasn't loaded */
  file: SharingAgreementFileResponse | null;
  /** What the caller may do with this sharing agreement. */
  capabilities: SharingAgreementCapabilitiesResponse;
}

interface SharingAgreementPartitionCoefficientResponse {
  /** Internal unique identifier of this coefficient */
  coefficientId: string;
  /** Supply this coefficient belongs to */
  supply: SupplyReferenceResponse;
  /** Partition coefficient value, on a 0-1 scale */
  coefficient: number;
  /** Start of the period during which this coefficient is active (inclusive). Null means this is a pending coefficient, materialised but not yet activated. */
  validFrom: string | null;
  /** End of the period (exclusive), as stored. Null unless explicitly closed. */
  validTo: string | null;
  /** Whether the distributor has applied this coefficient yet */
  applicationState: 'PENDING' | 'APPLIED';
  /** How/why this coefficient's coverage ends */
  endState: 'OPEN' | 'OPEN_ORPHAN' | 'PENDING_SUCCESSION' | 'DERIVED' | 'CLOSED';
  /** The effective end of this coefficient's coverage. Present only when endState is DERIVED or CLOSED. */
  endDate: string | null;
  /** The coefficient this supply is currently on in this agreement's plant -- what the value in this row would replace. Null when the supply has no active coefficient in this plant. */
  currentCoefficient: CurrentCoefficientResponse | null;
}

interface PartitionCoefficientResponse {
  /** Internal unique identifier */
  id: string;
  /** Supply this coefficient belongs to */
  supply: SupplyReferenceResponse;
  /** Community the supply belongs to */
  community: CommunityReferenceResponse;
  /** Plant this coefficient belongs to. Disambiguates a supply's timeline when it participates in more than one plant. */
  plant: PlantReferenceResponse;
  /** Sharing agreement that authored this coefficient. */
  sharingAgreement: SharingAgreementReferenceResponse;
  /** Partition coefficient value */
  coefficient: number;
  /** Start of the period during which this coefficient is active (inclusive). Null means this is a pending coefficient, materialised but not yet activated. */
  validFrom: string | null;
  /** End of the period (exclusive). Null means the period is still open; combined with a non-null validFrom that makes this the currently active coefficient for its plant. */
  validTo: string | null;
  /** Timestamp when this record was created */
  createdAt: string;
  /** What the caller may do from this period, including whether its sharingAgreement reference can be followed. */
  capabilities: PartitionCoefficientCapabilitiesResponse;
}

interface PlantResponse {
  id: string;
  /** The plant identifier assigned by the inverter provider (currently Huawei). Used verbatim as the station_code tag in InfluxDB: this is the join key between the PostgreSQL plant row and its time series. */
  providerCode: string;
  /** The identifier assigned by the regulator. In Spain this is the CAU (Codigo de Autoconsumo). It is not the provider's station code (provider_code) and not a CUPS. */
  regulatoryCode: string | null;
  /** The CIL (Código de la Instalación de producción a efectos de Liquidación): the plant's Spanish settlement code, assigned by the distribution company. 25 alphanumeric characters, upper-cased with no whitespace, unique across the platform. Null when the plant has none recorded. */
  cil: string | null;
  /** The supply this plant produces onto. A reference: the full supply, including its owner, is fetched from GET /supplies/{supplyId}, which not every caller who may list plants is allowed to call. */
  supply: SupplyReferenceResponse;
  name: string;
  address: string;
  description: string | null;
  inverterProvider: 'HUAWEI';
  /** Peak power of the plant's modules, in kWp. */
  peakPowerKWp: number;
  /** Power the plant can export to the grid, in kW, as capped by its inverters and grid connection. */
  nominalPowerKW: number;
  connectionDate: string | null;
  /** The community that owns the plant. */
  community: PlantCommunityResponse;
  /** What the caller may do with this plant. */
  capabilities: PlantCapabilitiesResponse;
}

interface SupplyResponse {
  /** Internal unique identifier of the supply */
  id: string;
  /** Code that identifies the supply */
  code: string;
  /** Owner of the supply, by id only. Null when the supply has no owner. */
  user: UserReferenceResponse | null;
  /** The owner's member record in the supply's community. Null when the supply has no owner, or its owner has no membership in that community. */
  ownerRecord: MemberRecordResponse | null;
  /** The plant whose own supply this is: the supply its production is measured at. Null when the supply is no plant's own supply. */
  plant: PlantReferenceResponse | null;
  /** Name of the supply */
  name: string | null;
  /** Address of the supply */
  address: string;
  /** Reference ID of the address */
  addressRef: string | null;
  /** Whether the supply is enabled or disabled */
  enabled: boolean;
  /** Contract information of the supply */
  contract: SupplyContractResponse | null;
  /** Distributor information of the supply */
  distributor: SupplyDistributorResponse | null;
  /** Shelly device information of the supply */
  shelly: SupplyShellyResponse | null;
  /** Community the supply belongs to */
  community: CommunityReferenceResponse;
  /** What the caller may do with this supply. */
  capabilities: SupplyCapabilitiesResponse;
}

interface SupplyReferenceResponse {
  /** Internal unique identifier of the supply */
  id: string;
  /** Code of the supply */
  code: string;
  /** Display name of the supply */
  name: string | null;
}

interface CurrentCoefficientResponse {
  /** The coefficient value currently in force, on a 0-1 scale */
  coefficient: number;
  /** When this coefficient took effect (inclusive) */
  validFrom: string;
  /** The agreement that authored the coefficient currently in force. May be the agreement being viewed, or an earlier one. */
  sharingAgreement: SharingAgreementReferenceResponse;
}

interface SharingAgreementFileResponse {
  /** Internal unique identifier of the stored file */
  id: string;
  /** Original filename as uploaded */
  filename: string;
  /** Date and time the file was uploaded */
  uploadedAt: string;
}

interface SharingAgreementCapabilitiesResponse {
  /** Whether the caller may read this agreement, its partition coefficients and its file. */
  canRead: boolean;
  /** Whether the caller may update, delete, publish or revert this agreement and edit its coefficients. Whether a particular one of those actions is possible right now also depends on the agreement's statu */
  canManage: boolean;
}

interface SharingAgreementReferenceResponse {
  /** Internal unique identifier of the agreement */
  id: string;
  /** Human-readable label for the agreement */
  name: string;
  /** Status of the agreement: DRAFT, PUBLISHED or SUPERSEDED */
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
}

interface CommunityReferenceResponse {
  /** Internal unique identifier of the community */
  id: string;
  /** Display name of the community */
  name: string;
}

interface PlantReferenceResponse {
  /** Internal unique identifier of the plant */
  id: string;
  /** Display name of the plant */
  name: string;
}

interface PlantCommunityResponse {
  /** Internal unique identifier of the community */
  id: string;
}

interface PartitionCoefficientCapabilitiesResponse {
  /** Whether the caller may open the sharing agreement referenced by this period (GET /api/v1/plants/{plantId}/sharing-agreements/{sharingAgreementId}). The reference carries no capabilities of its own, so */
  canReadSharingAgreement: boolean;
}

interface PlantCapabilitiesResponse {
  /** Whether the caller may read this plant. Open to any active member of its community. */
  canRead: boolean;
  /** Whether the caller may update or delete this plant, and read and write its Huawei configuration. */
  canManage: boolean;
  /** Whether the caller may list this plant's sharing agreements. Admin-only: their contents are not member-readable. */
  canListSharingAgreements: boolean;
  /** Whether the caller may create a sharing agreement under this plant. */
  canManageSharingAgreements: boolean;
  /** Whether the caller may open the supply referenced by this plant (GET /api/v1/supplies/{supplyId}). Listing plants is open to any member, but the supply behind one is not, so the reference carries no o */
  canReadSupply: boolean;
}

interface SupplyCapabilitiesResponse {
  /** Whether the caller may read this supply and its consumption and production series. */
  canRead: boolean;
  /** Whether the caller may update, enable or disable this supply. Narrower than canRead: the owner can read their supply but only a community admin may change it. */
  canEdit: boolean;
  /** Whether the caller may read this supply's partition coefficients. The same access reading the supply requires -- the coefficients describe the owner's own share. */
  canReadPartitionCoefficients: boolean;
  /** Whether the caller may create a plant on this supply (POST /api/v1/plants). */
  canCreatePlant: boolean;
  /** Whether the caller may delete this supply (DELETE /api/v1/supplies/{supplyId}). Authorization only: a supply with plants or partition coefficients is still refused with 409. */
  canDelete: boolean;
}

interface MemberRecordResponse {
  /** The member's full name, as this community records it. */
  fullName: string;
  /** The member's number in this community. Null if the community records none. */
  memberNumber: number | null;
  /** The member's address, as this community records it. Null if there is none. */
  address: string | null;
  /** The email address this community contacts the member at. Null if there is none. */
  contactEmail: string | null;
  /** The member's phone number, as this community records it. Null if there is none. */
  phoneNumber: string | null;
}

interface UserReferenceResponse {
  /** Internal unique identifier of the user */
  id: string;
}

interface AttentionItem {
  /** Stable key for the row. */
  key: string;
  /** Leading icon for the signal. */
  icon: ReactNode;
  /** Full Spanish label, e.g. "2 comunidades sin administrador". */
  label: string;
  /** Route the "Revisar" link points to. */
  to: string;
}

interface RecordListItem {
  id: string;
  /** Leading selection checkbox, named "Seleccionar <name>", for a page that acts on several records at once. When any item has one, every item gets the slot, so the rows stay aligned whether or not theirs can be selected. The actions on the selection live outside the list. */
  selection?: ReactNode;
  /** Leading avatar or icon. Optional — omit for records without one. */
  avatar?: ReactNode;
  title: string;
  /** The record's detail route. The title becomes its link; the row never does (UI-LST-002). */
  href?: string;
  /** Secondary marker under the title, e.g. a role chip. */
  badge?: ReactNode;
  /** Status chip, kept on the title line so state reads at a glance. */
  status?: ReactNode;
  /** Plain lines under the badge, one per row. A long value wraps rather than being cut, so nothing is hidden. */
  lines?: ReactNode[];
  fields?: RecordField[];
  /** Mutes the row, e.g. for a disabled record. */
  inactive?: boolean;
}

interface RecordField {
  label: string;
  value: ReactNode;
}

type FilterStatus = 'all' | 'active' | 'inactive';

interface CoefficientActionsMenuItem {
  action: 'apply' | 'correct' | 'deactivate' | 'close' | 'reopen';
  /** Present (non-empty) marks the item unavailable and renders this text as a secondary line — never via MUI's `disabled` prop, which would make the item unfocusable and drop it from arrow-key navigation. */
  disabledReason?: string | undefined;
}

interface MenuItem {
  to: string;
  id: string;
  icon: SvgIconComponent; // e.g. Icons.Bolt
  label: string;
  /** What the backend must allow before this entry is offered. The same vocabulary the routes use, and deliberately per item rather than per section: Miembros and Integraciones sit together but are not the */
  requires: { scope: 'always'; } | { scope: 'platform'; capability: MenuPlatformCapability; } | { scope: 'community'; capability: MenuCommunityCapability; };
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface ContactChannelResponse {
  /** The name shown for the channel. */
  label: string;
  /** Free text about the channel. Null if it has none. */
  notes: string | null;
  /** When the channel is attended. Null if it has no schedule. */
  schedule: string | null;
  /** The kind of channel. */
  type: 'PHONE' | 'EMAIL' | 'ADDRESS';
  /** The phone number, email address or postal address. */
  value: string;
}

/** One channel as `ContactChannelEditor` holds it: every field a string, nothing trimmed yet. */
interface ContactChannelDraft {
  type: 'PHONE' | 'EMAIL' | 'ADDRESS';
  label: string;
  value: string;
  schedule: string;
  notes: string;
}

/** `ContactChannelEditor`'s `fieldErrors`: a message per field in error. */
interface ContactChannelErrors {
  type?: string;
  label?: string;
  value?: string;
  schedule?: string;
  notes?: string;
}

interface SupplyEnergyMetricsResponse {
  /** How much of the period is backed by stored records. */
  coverage: SupplyEnergyMetricsCoverageResponse;
  /** The energy totals the ratios were derived from. */
  energy: SupplyEnergyMetricsEnergyResponse;
  /** The period the metrics were computed over. */
  period: SupplyEnergyMetricsPeriodResponse;
  /** What the self-consumed energy of the period was worth. */
  savings: SupplyEnergyMetricsSavingsResponse;
  /** Share of the energy assigned to this supply that it consumed rather than fed back to the grid, on a 0-1 scale. Null when nothing was assigned to the supply in the period, and for a plant's own supply, */
  selfConsumptionRatio: number | null;
  /** The energy selfConsumptionRatio was computed from, and the plant's own supplies it leaves out. Both figures are 0 when the status is NOT_APPLICABLE. */
  selfConsumptionRatioBasis: SelfConsumptionRatioBasisResponse;
  /** Whether selfConsumptionRatio could be computed. AVAILABLE: it is. NOTHING_ASSIGNED: no energy was assigned to the supplies it covers, which includes a period without data. NOT_APPLICABLE: the supply i */
  selfConsumptionRatioStatus: 'AVAILABLE' | 'NOTHING_ASSIGNED' | 'NOT_APPLICABLE';
  /** Share of the energy consumed that came from the community rather than from the grid, on a 0-1 scale. Null when nothing was consumed in the period. */
  selfSufficiencyRatio: number | null;
  /** The supply the metrics were computed for. */
  supply: SupplyEnergyMetricsSupplyResponse;
}

interface MembershipEnergyMetricsResponse {
  /** How much of the period is backed by stored records, across every supply of the membership. */
  coverage: MembershipEnergyMetricsCoverageResponse;
  /** The energy totals of every supply of the membership, summed. */
  /** The same fields as SupplyEnergyMetricsEnergyResponse. */
  energy: SupplyEnergyMetricsEnergyResponse;
  /** The period the metrics were computed over, the same for every supply. */
  period: SupplyEnergyMetricsPeriodResponse;
  /** What the self-consumed energy of the membership's supplies was worth over the period. */
  /** The same fields as SupplyEnergyMetricsSavingsResponse. */
  savings: SupplyEnergyMetricsSavingsResponse;
  /** Share of the energy assigned to the membership's supplies that they consumed rather than fed back to the grid, on a 0-1 scale, computed from the summed energy of the supplies that are no plant's own s */
  selfConsumptionRatio: number | null;
  /** The energy selfConsumptionRatio was computed from, and the plant's own supplies it leaves out. Both figures are 0 when the status is NOT_APPLICABLE. */
  selfConsumptionRatioBasis: SelfConsumptionRatioBasisResponse;
  /** Whether selfConsumptionRatio could be computed. AVAILABLE: it is. NOTHING_ASSIGNED: no energy was assigned to the supplies it covers, which includes a period without data. NOT_APPLICABLE: every supply */
  selfConsumptionRatioStatus: 'AVAILABLE' | 'NOTHING_ASSIGNED' | 'NOT_APPLICABLE';
  /** Share of the energy the membership's supplies consumed that came from the community rather than from the grid, on a 0-1 scale, computed from the summed totals. Null when nothing was consumed in the pe */
  selfSufficiencyRatio: number | null;
}

interface SupplyEnergyMetricsSupplyResponse {
  /** Code that identifies the supply */
  code: string;
  /** Internal unique identifier of the supply */
  id: string;
  /** Name of the supply */
  name: string | null;
}

interface SupplyEnergyMetricsPeriodResponse {
  /** End of the aggregation, exclusive: the first instant not included */
  endDate: string | null;
  /** First instant included in the aggregation, inclusive */
  startDate: string | null;
}

interface SupplyEnergyMetricsCoverageResponse {
  /** Number of hours the period spans. Accounts for daylight saving transitions, so a transition day contributes 23 or 25 hours rather than 24. */
  expectedHours: number;
  /** Number of hourly consumption records found in the period */
  hoursWithData: number;
}

interface MembershipEnergyMetricsCoverageResponse {
  /** Number of hours the period spans, times the number of supplies of the membership. A supply without any record therefore lowers coverage even when the rest are complete. Accounts for daylight saving tr */
  expectedHours: number;
  /** Number of hourly consumption records found in the period, summed across every supply of the membership */
  hoursWithData: number;
  /** Number of those supplies with at least one hourly record in the period */
  suppliesWithData: number;
  /** Number of supplies of the membership in this community */
  supplyCount: number;
}

interface SupplyEnergyMetricsEnergyResponse {
  /** Energy assigned to this supply: selfConsumptionKWh plus surplusKWh. In kWh, rounded to 3 decimals after summing, so it can differ by 0.001 from the sum of the rounded figures. */
  assignedProductionKWh: number;
  /** Energy taken from the grid by this supply over the period. Does not include self-consumed energy. In kWh, rounded to 3 decimals. */
  gridImportKWh: number;
  /** Energy produced by the community and consumed by this supply over the period, as reported by the distributor. In kWh, rounded to 3 decimals. */
  selfConsumptionKWh: number;
  /** Energy assigned to this supply and fed back to the grid over the period. In kWh, rounded to 3 decimals. */
  surplusKWh: number;
  /** Energy consumed, whatever its origin: gridImportKWh plus selfConsumptionKWh. In kWh, rounded to 3 decimals after summing, so it can differ by 0.001 from the sum of the rounded figures. */
  totalConsumptionKWh: number;
}

interface SupplyEnergyMetricsSavingsResponse {
  /** Estimated amount saved over the period, in euros, rounded to cents. Null when no period could be resolved, which is not the same as a saving of zero. */
  amountEur: number | null;
  /** The estimated energy-term price, before taxes, the amount was priced with. Present only when the estimated price was used to price at least part of the period; null when the whole period was priced wi */
  estimatedPrice: EstimatedPriceResponse | null;
  /** Whether the prices behind the amount are the supply's contracted tariff or an estimate. A single estimated stretch of the period makes the whole amount an estimate. */
  tariffSource: 'REAL_TARIFF' | 'ESTIMATE';
}

interface EstimatedPriceResponse {
  /** Estimated price of the energy term, in euros per kWh, before taxes. The power term, access tolls, charges, electricity tax and VAT are not included. Returned exactly as configured, without rounding. */
  eurPerKWh: number;
}

interface SelfConsumptionRatioBasisResponse {
  /** Energy assigned to the supplies the ratio covers: selfConsumptionKWh plus surplus over the period, and the ratio's denominator. In kWh, rounded to 3 decimals after summing. */
  assignedProductionKWh: number;
  /** How many supplies that are a plant's own supply the ratio leaves out. Their energy is in neither figure above. */
  excludedPlantSupplyCount: number;
  /** Energy produced by the community and consumed by the supplies the ratio covers over the period, as reported by the distributor: the ratio's numerator. In kWh, rounded to 3 decimals. */
  selfConsumptionKWh: number;
}

interface MembershipResponse {
  /** When the membership was accepted. Null while it is pending: a pending membership grants no access until it is accepted. Independent of enabled. */
  acceptedAt: string | null;
  /** The member's address, as this community records it. Null if there is none. */
  address: string | null;
  /** What the caller may do with this membership. MemberPicker reads none of it: pass `{}`. */
  capabilities: MembershipCapabilitiesResponse;
  communityId: string;
  /** The email address this community contacts the member at. Null if there is none. */
  contactEmail: string | null;
  enabled: boolean;
  /** The member's full name, as this community records it. */
  fullName: string;
  id: string;
  /** When the membership's invitation link expires. Null when it has no link that can still be used: none was sent, it was revoked or used, or it has expired. */
  invitationExpiresAt: string | null;
  /** When the membership was last sent an invitation. Null if none has been sent. */
  invitedAt: string | null;
  /** Whether demoting this membership to member, or deleting it, would be refused right now with MEMBERSHIP_LAST_ACTIVE_ADMIN: true only for the community's last active admin. A pending or suspended admin, */
  lastActiveAdmin: boolean;
  /** The member's number in this community. Null if the community records none. */
  memberNumber: number | null;
  /** The member's DNI/NIE/NIF, normalised: the one the community registered them with. */
  personalId: string;
  /** The member's phone number, as this community records it. Null if there is none. */
  phoneNumber: string | null;
  role: 'COMMUNITY_MEMBER' | 'COMMUNITY_ADMIN';
  /** The member's account, by id only: the {userId} the membership's endpoints take. Nothing else of the account is carried. */
  user: UserReferenceResponse;
}

/** `PeriodUsageCard` and `PeriodTotals` take either: one supply's figures, or the membership's ("Todos mis puntos"). */
type PeriodEnergyMetrics = MembershipEnergyMetricsResponse | SupplyEnergyMetricsResponse;

/** `MemberPicker`'s `status`: where the read of the roster it offers stands. */
type MemberPickerStatus = 'loading' | 'ready' | 'error';

/** `PeriodHeader`'s `anchor`: the latest published period, a calendar month or day (month is 1-12). */
type Anchor =
  | { kind: 'month'; month: { year: number; month: number } }
  | { kind: 'day'; day: { year: number; month: number; day: number } };

/**
 * `PeriodHeader`'s `resolution` (`Extract<PeriodResolution, { status: "ok" }>` in its `.d.ts`): the
 * period on show. `title` is the heading, "Datos de septiembre de 2026".
 */
interface PeriodResolutionOk {
  status: 'ok';
  /** `startDate` included, `endDate` excluded, both in Europe/Madrid with their offset. */
  period: { startDate: string; endDate: string; granularity: 'hourly' | 'daily' | 'monthly'; label: string };
  title: string;
  firstDay: { year: number; month: number; day: number };
  lastDay: { year: number; month: number; day: number };
  pickedDays: number;
  /** Set when a range longer than 62 days was widened to whole months; `text` says so. */
  snapped: { from: { year: number; month: number; day: number }; to: { year: number; month: number; day: number }; months: number; text: string } | null;
}

interface PresetDefinition {
  /** Its value in the query string: ?period={value}. Unique within a page's list. */
  value: 'latest' | 'year' | 'last12' | 'last7' | 'last30';
  name: (anchor: Anchor) => string;
  /** The kinds of anchor it derives a period from. A page offers it only against one of them. */
  accepts: readonly ('month' | 'day')[];
  /** Its first and last calendar day, both included. */
  range: (anchor: Anchor) => { from: { year: number; month: number; day: number }; to: { year: number; month: number; day: number } };
  /** How it is offered, when its period's label and granularity would not say it: see `presetSummary`. */
  summary?: (anchor: Anchor, resolution: PeriodResolutionOk) => string;
}

type SupplyOwnerField = { mode: 'choose'; status: MemberPickerStatus; options: MembershipResponse[]; } | { mode: 'show'; fullName: string | null; };

interface SupplyFieldValues {
  name: string;
  cups: string;
  address: string;
  addressRef: string;
  ownerId: string | null;
}

interface PlantFieldValues {
  providerCode: string;
  regulatoryCode: string;
  /** As typed: normalised only when it is sent. */
  cil: string;
  name: string;
  address: string;
  description: string;
  /** As typed, so that an empty or partial number stays what the user sees. */
  peakPowerKWp: string;
  /** As typed, like the peak power. */
  nominalPowerKW: string;
  /** A dayjs date: leave it null, or start from `plantFieldValuesOf(plant)`, which converts the plant's `connectionDate`. */
  connectionDate: Dayjs | null;
  supplyCode: string | null;
}

/** One day of `toConsumptionSeriesView`'s `membershipDaily` buckets; `membershipMonthly` buckets have the same fields, one per month, dated on its first day. `date` is written "2026/09/01". */
interface MembershipDailyConsumptionBucketResponse {
  /** Energy assigned to every supply of the membership over the day: selfConsumptionKWh plus surplusKWh. In kWh, rounded to 3 decimals after summing, so it can differ by 0.001 from the sum of the rounded f */
  assignedProductionKWh: number;
  /** The day, a local calendar date in the community's time zone. */
  date: string;
  /** Energy taken from the grid by every supply of the membership over the day. Does not include self-consumed energy. In kWh, rounded to 3 decimals. 0 when no supply stored a record. */
  gridImportKWh: number;
  /** Estimated amount the day's self-consumed energy saved across every supply that stored a record, in euros, rounded to cents. Null when no supply stored a record that day: a day with nothing stored is n */
  savingsEur: number | null;
  /** Energy produced by the community and consumed by every supply of the membership over the day, as reported by the distributor. In kWh, rounded to 3 decimals. */
  selfConsumptionKWh: number;
  /** Number of those supplies that stored at least one hourly record that day, within the period. Measured day by day, whereas the aggregated energy metrics measure their suppliesWithData over the whole pe */
  suppliesWithData: number;
  /** Number of supplies the member currently owns in the community. The model records no date a supply joined, so the same count applies to every day, including days before a supply started reporting. */
  supplyCount: number;
  /** Energy assigned to every supply of the membership and fed back to the grid over the day. In kWh, rounded to 3 decimals. */
  surplusKWh: number;
  /** Whether the prices behind savingsEur are the supplies' contracted tariffs or an estimate. A single estimated stretch of any supply makes the whole amount an estimate. Null exactly when savingsEur is n */
  tariffSource: 'REAL_TARIFF' | 'ESTIMATE' | null;
  /** Local time the day starts at in the community's time zone: always midnight, also for a first day the period starts in the middle of. */
  time: string;
}

interface SharingAgreementFormInitialValues {
  name?: string;
  notes?: string;
  nominalPowerKW?: number;
  distributorFileSentOn?: string | null;
}

interface SharingAgreementFormValues {
  name: string;
  /** `null` when left empty. */
  notes: string | null;
  nominalPowerKW: number;
  /** A local date ("2026-03-01"), or `null` when the field is empty. Always `null` in create mode, which does not offer the field. */
  distributorFileSentOn: string | null;
}

/** `PeriodSelector`'s `selection`: a preset by its value, or a custom range with both days included. */
type PeriodSelection =
  | { kind: 'latest' | 'year' | 'last12' | 'last7' | 'last30' }
  | { kind: 'custom'; from: { year: number; month: number; day: number }; to: { year: number; month: number; day: number } };
```
